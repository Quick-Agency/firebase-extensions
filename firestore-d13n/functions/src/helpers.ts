import config from "./config";
import * as log from "./logs";
import { firestore } from "./firebase";
import { Change } from "firebase-functions";
import {
  QueryDocumentSnapshot,
  DocumentSnapshot,
} from "firebase-admin/firestore";

export const fieldPathsChanged = (change: Change<QueryDocumentSnapshot>) => {
  const before = change.before;
  const after = change.after;

  const changedPaths = config.sourceDocumentFields.filter(
    (path) =>
      JSON.stringify(before.get(path)) !== JSON.stringify(after.get(path)),
  );

  if (changedPaths.length > 0)
    log.sourceDocumentFieldChanged(
      Object.fromEntries(
        changedPaths.map((path) => [
          path,
          { before: before.get(path), after: after.get(path) },
        ]),
      ),
    );

  return changedPaths.length > 0;
};

export const updateObject = async (after: DocumentSnapshot) => {
  try {
    const rootCollections = await firestore.listCollections();
    const queries = await Promise.all(
      config.targetCollectionNames.map((collectionName, index) => {
        const targetDocumentField = config.targetDocumentFields[index];

        // Only use collection Group for non root collections
        const collectionRef =
          rootCollections.findIndex(
            (rootCollection) => rootCollection.id === collectionName,
          ) > -1
            ? firestore.collection(collectionName)
            : firestore.collectionGroup(collectionName);
        return collectionRef
          .where(
            targetDocumentField.replace(config.docIdWildcard, after.id),
            "==",
            after.id,
          )
          .get();
      }),
    );
    const bulk = firestore.bulkWriter();

    let count = 0;

    for (const [index, query] of queries.entries()) {
      const targetDocumentField = config.targetDocumentFields[index];
      const [genericParentPath] =
        targetFieldPathToParentPathAndSegment(targetDocumentField);
      const parentPath = genericParentPath.replace(
        config.docIdWildcard,
        after.id,
      );

      query.docs.forEach((doc) => {
        const prev = doc.get(parentPath);
        if (typeof prev !== "object" || prev === null) {
          log.previousValueInvalid(doc.id, doc.data());
          return;
        }

        // Replace previous value by after values except for the trigger doc id
        // If the trigger doc do not have a field, keep the previous value
        const next = Object.fromEntries(
          Object.entries(prev).map(([key, prevValue]) =>
            prevValue === after.id
              ? [key, after.id]
              : [key, after.get(key) || prevValue],
          ),
        );

        bulk.update(doc.ref, {
          [parentPath]: next,
        });
        count += 1;
      });
    }

    await bulk.close();
    log.updateCompleted(count);
    return count;
  } catch (error) {
    log.updateFailed(
      `An error occurred while updating documents triggered by an update of: ${after.ref.path}`,
      after.ref.id,
      after,
    );
    throw error;
  }
};

export const targetFieldPathToParentPathAndSegment = (path: string) => {
  const segments = path.split(".");
  const parentPath = segments.slice(0, -1).join(".");
  const lastSegment = segments.at(-1);
  if (segments.length < 2 || !lastSegment) {
    const reason = `Target field path ${path} should have at least two segments delimited by a '.'`;
    log.configInvalid(reason);
    throw new Error(reason);
  }

  return [parentPath, lastSegment];
};

export const batchUpdate = async ({
  startAfterDocId,
  sourceDocs = 0,
  targetDocs = 0,
}: {
  startAfterDocId?: string;
  sourceDocs?: number;
  targetDocs?: number;
}) => {
  let query = firestore
    .collection(config.sourceCollectionName)
    .limit(config.batchUpdateLimit)
    .orderBy("__name__", "asc");

  const startAfterSnapshot = startAfterDocId
    ? await firestore
        .collection(config.sourceCollectionName)
        .doc(startAfterDocId)
        .get()
    : undefined;

  // Offset query if necessary
  if (startAfterSnapshot && startAfterSnapshot.exists) {
    query = query.startAfter(startAfterSnapshot);
  }

  const result = await query.get();

  if (result.empty) {
    return {
      done: true,
      sourceDocs,
      targetDocs,
      startAfterDocId: undefined,
    };
  }

  const docsUpdated = await Promise.all(
    result.docs.map((doc) => updateObject(doc)),
  );

  const lastDoc = result.docs[result.docs.length - 1];

  return {
    done: false,
    sourceDocs: sourceDocs + result.size,
    targetDocs: targetDocs + docsUpdated.reduce((sum, num) => sum + num, 0),
    startAfterDocId: lastDoc.id,
  };
};
