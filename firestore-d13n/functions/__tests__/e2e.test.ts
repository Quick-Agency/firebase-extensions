import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
import { Config } from "../src/types";
import { targetFieldPathToParentPathAndSegment } from "../src/helpers";

if (getApps().length === 0) {
  initializeApp();
}

describe("onUpdate trigger", () => {
  const db = getFirestore();

  const user = {
    firstname: "John",
    lastname: "Doe",
  };
  let sourceDocRef: DocumentReference;
  let targetDocRefs: DocumentReference[];

  let config: Config;

  beforeAll(() => {
    // Config must be initialized in the describe function to access process.env variables setup in hook.ts
    config = {
      location: process.env.LOCATION as string,
      sourceCollectionName: process.env.SOURCE_COLLECTION_NAME as string,
      sourceDocumentFields: process.env.SOURCE_DOCUMENT_FIELDS?.split(
        ",",
      ) as string[],
      targetCollectionNames: process.env.TARGET_COLLECTION_NAMES?.split(
        ",",
      ) as string[],
      targetDocumentFields: process.env.TARGET_DOCUMENT_FIELDS?.split(
        ",",
      ) as string[],
      doBackfill: process.env.DO_BACKFILL === "true",
      docIdWildcard: "{docId}",
      batchUpdateLimit: 10,
    };
  });

  afterAll(async () => {
    // Clean up all documents
    await Promise.all([
      db.recursiveDelete(db.collection(config.sourceCollectionName)),
      ...config.targetCollectionNames.map((targetCollectionName) =>
        db.recursiveDelete(db.collection(targetCollectionName)),
      ),
    ]);
  });

  beforeEach(async () => {
    sourceDocRef = db.collection(config.sourceCollectionName).doc();
    await sourceDocRef.set(user);

    // Create target documents with dummy data
    targetDocRefs = await Promise.all(
      config.targetCollectionNames.map((collectionName) =>
        db.collection(collectionName).add({ name: "Test" }),
      ),
    );

    // Add to each doc the denormalized user data
    await Promise.all(
      config.targetCollectionNames.map((collectionName, index) => {
        const targetDocumentField = config.targetDocumentFields[index];
        const [parentPath, lastSegment] =
          targetFieldPathToParentPathAndSegment(targetDocumentField);

        return targetDocRefs[index].update({
          [parentPath.replace(config.docIdWildcard, sourceDocRef.id)]: {
            [lastSegment]: sourceDocRef.id,
            ...user,
          },
        });
      }),
    );
  });

  it("should update matching documents in target collections", async () => {
    const newFirstname = "Jane";
    await sourceDocRef.update({ firstname: newFirstname });

    const matchingNewFirstName: boolean[] = [];

    await Promise.all(
      targetDocRefs.map(
        (targetDocRef, index) =>
          new Promise((resolve) => {
            const unsubscribe = targetDocRef.onSnapshot((snapshot) => {
              const targetDocumentField = config.targetDocumentFields[index];
              const [parentPath] =
                targetFieldPathToParentPathAndSegment(targetDocumentField);

              if (
                snapshot.get(
                  parentPath.replace(config.docIdWildcard, sourceDocRef.id),
                ).firstname === newFirstname
              ) {
                matchingNewFirstName.push(true);
                unsubscribe();
                resolve(null);
              }
            });
          }),
      ),
    );

    expect(matchingNewFirstName).toHaveLength(targetDocRefs.length);
    expect(matchingNewFirstName.every(Boolean)).toBeTruthy();
  });

  it("should update only matching fields on target documents", async () => {
    const userWithDummyField = {
      dummy: "dummy",
      ...user,
    };
    // Add to each doc the denormalized user data and a dummy field
    await Promise.all(
      config.targetCollectionNames.map((collectionName, index) => {
        const targetDocumentField = config.targetDocumentFields[index];
        const [parentPath, lastSegment] =
          targetFieldPathToParentPathAndSegment(targetDocumentField);

        return targetDocRefs[index].update({
          [parentPath.replace(config.docIdWildcard, sourceDocRef.id)]: {
            [lastSegment]: sourceDocRef.id,
            ...userWithDummyField,
          },
        });
      }),
    );

    const newFirstname = "Jane";
    await sourceDocRef.update({ firstname: newFirstname });

    const matchingNewFirstName: boolean[] = [];
    const untouchedDummyField: boolean[] = [];

    await Promise.all(
      targetDocRefs.map(
        (targetDocRef, index) =>
          new Promise((resolve) => {
            const unsubscribe = targetDocRef.onSnapshot((snapshot) => {
              const targetDocumentField = config.targetDocumentFields[index];
              const [parentPath] =
                targetFieldPathToParentPathAndSegment(targetDocumentField);

              if (
                snapshot.get(
                  parentPath.replace(config.docIdWildcard, sourceDocRef.id),
                ).firstname === newFirstname
              ) {
                matchingNewFirstName.push(true);
                untouchedDummyField.push(
                  snapshot.get(
                    parentPath.replace(config.docIdWildcard, sourceDocRef.id),
                  ).dummy === "dummy",
                );
                unsubscribe();
                resolve(null);
              }
            });
          }),
      ),
    );

    expect(matchingNewFirstName).toHaveLength(targetDocRefs.length);
    expect(matchingNewFirstName.every(Boolean)).toBeTruthy();
    expect(untouchedDummyField).toHaveLength(targetDocRefs.length);
    expect(untouchedDummyField.every(Boolean)).toBeTruthy();
  });
});
