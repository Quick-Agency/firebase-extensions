import config from "./config";
import * as log from "./logs";
import { firestore } from "./firebase";
import { DocumentSnapshot } from "firebase-admin/firestore";
import { targetFieldPathToParentPathAndSegment } from "./utils";

export const updateObject = async (after: DocumentSnapshot) => {
  try {
    const rootCollections = await firestore.listCollections();

    const queries = await Promise.allSettled(
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

    // Throw error if any query failed
    const queriesError: Parameters<
      typeof log.targetCollectionQueryiesFailed
    >[0] = [];
    for (const [index, result] of queries.entries()) {
      if (result.status === "rejected") {
        queriesError.push({
          reason: result.reason,
          targetCollectionName: config.targetCollectionNames[index],
          fieldPath: config.targetDocumentFields[index],
        });
      }
    }
    if (queriesError.length > 0) {
      log.targetCollectionQueryiesFailed(queriesError);
      throw new Error("Target collection queries failed");
    }

    const bulk = firestore.bulkWriter();

    let count = 0;
    let next: any | undefined = undefined; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Use denormalize function if provided, otherwise next value will be compute based on target document previous value
    if (config.sourceDenormalizeFunctionName) {
      const url = process.env.FIREBASE_EMULATOR_HUB
        ? `http://127.0.0.1:5001/${config.projectId}/${config.location}/${config.sourceDenormalizeFunctionName}`
        : `https://${config.location}-${config.projectId}.cloudfunctions.net/${config.sourceDenormalizeFunctionName}`;

      const init: RequestInit = {
        headers: {
          ["Content-Type"]: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          data: { docId: after.id, docPath: after.ref.path, ...after.data() },
        }),
      };

      // fetch callable fuction and catch fetch error
      const res = await fetch(url, init).catch((error) => {
        log.fetchDenormalizeFunctionFailed(url, error);
        throw new Error("Fetch denormalize function failed");
      });

      // Throw error if response is not ok or not json
      if (
        !res.ok ||
        !res.headers.get("content-type")?.includes("application/json")
      ) {
        log.denormalizeFunctionFailed(
          url,
          res.status,
          res.statusText,
          res.headers,
        );
        throw new Error("Denormalize function failed");
      }

      const json = await res.json();
      next = json.result;
    }

    for (const [index, query] of queries.entries()) {
      const targetDocumentField = config.targetDocumentFields[index];
      const [genericParentPath, lastSegmentPath] =
        targetFieldPathToParentPathAndSegment(targetDocumentField);
      const parentPath = genericParentPath.replace(
        config.docIdWildcard,
        after.id,
      );

      // All queries should be fulfilled has we checked for errors above
      if (query.status === "rejected") {
        continue;
      }

      query.value.docs.forEach((doc) => {
        const prev = doc.get(parentPath);
        if (typeof prev !== "object" || prev === null) {
          log.previousValueInvalid(doc.id, doc.data());
          return;
        }

        // If no transform function is provided, replace previous value by after values except for the trigger doc id
        // If the trigger doc do not have a field, keep the previous value
        if (next === undefined) {
          next = Object.fromEntries(
            Object.entries(prev).map(([key, prevValue]) =>
              prevValue === after.id
                ? [key, after.id]
                : [key, after.get(key) || prevValue],
            ),
          );
        } else {
          // Add the use for matching id in case the user provided denormalize function does not return it
          next[lastSegmentPath] = after.id;
        }

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
