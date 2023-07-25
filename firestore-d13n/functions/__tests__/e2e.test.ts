import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
import { Config } from "../src/types";
import { getConfigFromEnv } from "./utils";
import { targetFieldPathToParentPathAndSegment } from "../src/utils";

if (getApps().length === 0) {
  initializeApp();
}

describe("onUpdate trigger", () => {
  const db = getFirestore();

  const user = {
    firstname: "John",
    lastname: "Doe",
    details: {
      mobile: "1234567890",
    },
  };
  let sourceDocRef: DocumentReference;
  let targetDocRefs: DocumentReference[];

  let config: Config;

  beforeAll(() => {
    // Config must be initialized in the describe function to access process.env variables setup in hook.ts
    config = getConfigFromEnv();
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
            firstname: user.firstname,
            lastname: user.lastname,
            mobile: user.details.mobile,
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
});
