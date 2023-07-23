import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, DocumentReference } from "firebase-admin/firestore";
import { type Change } from "firebase-functions";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import config from "../src/config";
import * as logs from "../src/logs";
import {
  batchUpdate,
  targetFieldPathToParentPathAndSegment,
  fieldPathsChanged,
} from "../src/helpers";

// Mock config module to override environment variables and avoid conflict with e2e tests
jest.mock("../src/config", () => ({
  __esModule: true,
  default: null,
}));

const consoleLogSpy = jest
  .spyOn(logs, "sourceDocumentFieldChanged")
  .mockImplementation();

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

describe.only("fieldPathsChanged helper functins", () => {
  // Mock the change object
  const changeMockFactory = (
    beforeData: Record<string, unknown>,
    afterData: Record<string, unknown>,
  ) =>
    ({
      before: {
        get: jest.fn().mockImplementation((path: string) => beforeData[path]),
      },
      after: {
        get: jest.fn().mockImplementation((path: string) => afterData[path]),
      },
    }) as unknown as Change<QueryDocumentSnapshot>;

  beforeAll(() => {
    // @ts-ignore override mocked config with default values because this suite do not interact with firestore
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

  it("should return false if no fields changed", () => {
    const beforeData = {
      firstname: "John",
      lastname: "Doe",
    };
    const afterData = {
      firstname: "John",
      lastname: "Doe",
    };

    const result = fieldPathsChanged(changeMockFactory(beforeData, afterData));

    expect(result).toBeFalsy();
  });

  it("should return true if fields changed and logged change path", () => {
    const beforeData = {
      firstname: "John",
      lastname: "Doe",
    };
    const afterData = {
      firstname: "John",
      lastname: "Smith",
    };

    const result = fieldPathsChanged(changeMockFactory(beforeData, afterData));

    expect(result).toBeTruthy();
    expect(consoleLogSpy).toHaveBeenCalledWith({
      lastname: { before: "Doe", after: "Smith" },
    });
  });
});

describe("batchUpdate helper functions", () => {
  const db = getFirestore();

  const sourceDocRefs: DocumentReference[] = [];

  beforeAll(() => {
    // @ts-ignore override mocked config
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
