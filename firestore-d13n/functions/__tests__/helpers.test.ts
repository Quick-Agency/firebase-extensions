import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
// import { Config } from "../src/types";
import config from "../src/config";
import {
  batchUpdate,
  targetFieldPathToParentPathAndSegment,
} from "../src/helpers";

// Mock config module to override environment variables and avoid conflict with e2e tests
jest.mock("../src/config", () => ({
  __esModule: true,
  default: null,
}));

if (getApps().length === 0) {
  initializeApp();
}

describe("targetFieldPathToParentPathAndSegment helper functions", () => {
  it("should throw if less than two segment", () => {
    expect(() => {
      targetFieldPathToParentPathAndSegment("a");
    }).toThrow();
  });

  it("should return the parent path and segment path", () => {
    const [simpleParentPath, simpleSegment] =
      targetFieldPathToParentPathAndSegment("user.id");
    expect(simpleParentPath).toEqual("user");
    expect(simpleSegment).toEqual("id");

    const [complexParentPath, complexSegment] =
      targetFieldPathToParentPathAndSegment("users.{docId}.address.id");
    expect(complexParentPath).toEqual("users.{docId}.address");
    expect(complexSegment).toEqual("id");
  });
});

describe("batchUpdate helper functions", () => {
  const db = getFirestore();

  // let config: Config;

  const sourceDocRefs: DocumentReference[] = [];

  beforeAll(() => {
    // Config must be initialized in the describe function to access process.env variables setup in hook.ts
    // config = {
    //   location: process.env.LOCATION as string,
    //   sourceCollectionName: process.env.SOURCE_COLLECTION_NAME as string,
    //   sourceDocumentFields: process.env.SOURCE_DOCUMENT_FIELDS?.split(
    //     ",",
    //   ) as string[],
    //   targetCollectionNames: process.env.TARGET_COLLECTION_NAMES?.split(
    //     ",",
    //   ) as string[],
    //   targetDocumentFields: process.env.TARGET_DOCUMENT_FIELDS?.split(
    //     ",",
    //   ) as string[],
    //   doBackfill: process.env.DO_BACKFILL === "true",
    //   docIdWildcard: "{docId}",
    //   batchUpdateLimit: 10,
    // };
    // @ts-ignore
    config = {
      location: process.env.LOCATION as string,
      sourceCollectionName: "firestore-d13n-helpers-batchUpdate-sources",
      sourceDocumentFields: process.env.SOURCE_DOCUMENT_FIELDS?.split(
        ",",
      ) as string[],
      targetCollectionNames: ["firestore-d13n-helpers-batchUpdate-targets"],
      targetDocumentFields: process.env.TARGET_DOCUMENT_FIELDS?.split(
        ",",
      ) as string[],
      doBackfill: process.env.DO_BACKFILL === "true",
      docIdWildcard: "{docId}",
      batchUpdateLimit: 10,
    };
  });

  afterEach(async () => {
    // Clean up all documents
    await Promise.all([
      db.recursiveDelete(db.collection(config.sourceCollectionName)),
    ]);
  });

  beforeEach(async () => {
    await Promise.all(
      [...Array(config.batchUpdateLimit + 1)].map(() => {
        const docRef = db.collection(config.sourceCollectionName).doc();
        sourceDocRefs.push(docRef);
        return docRef.set({ name: "Test" });
      }),
    );
  });

  afterEach(async () => {
    await Promise.all(sourceDocRefs.map((docRef) => docRef.delete()));
  });

  it("should loop through all documents in source collection", async () => {
    const firstBatchUpdate = await batchUpdate({});

    expect(firstBatchUpdate.done).toBeFalsy();
    expect(firstBatchUpdate.sourceDocs).toEqual(config.batchUpdateLimit);
    expect(firstBatchUpdate.startAfterDocId).toBeDefined();

    const secondBatchUpdate = await batchUpdate(firstBatchUpdate);

    expect(secondBatchUpdate.done).toBeFalsy();
    expect(secondBatchUpdate.sourceDocs).toEqual(sourceDocRefs.length);
    expect(secondBatchUpdate.startAfterDocId).toBeDefined();

    const thirdBatchUpdate = await batchUpdate(secondBatchUpdate);

    expect(thirdBatchUpdate.done).toBeTruthy();
    expect(thirdBatchUpdate.sourceDocs).toEqual(sourceDocRefs.length);
    expect(thirdBatchUpdate.startAfterDocId).toBeUndefined();
  });
});
