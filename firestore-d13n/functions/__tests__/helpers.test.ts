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
  updateObject,
} from "../src/helpers";
import { getConfigFromEnv } from "./utils";
import { mock } from "node:test";

// Mock config module to override environment variables and avoid conflict with e2e tests
jest.mock("../src/config", () => ({
  __esModule: true,
  default: null,
}));

// Mock logs module to validate logs and avoid logging in tests
const configInvalidLogSpy = jest
  .spyOn(logs, "configInvalid")
  .mockImplementation();
const sourceDocumentFieldChangedLogSpy = jest
  .spyOn(logs, "sourceDocumentFieldChanged")
  .mockImplementation();
const updateCompletedLogSpy = jest
  .spyOn(logs, "updateCompleted")
  .mockImplementation();

if (getApps().length === 0) {
  initializeApp();
}

// Clear all mock before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe("targetFieldPathToParentPathAndSegment helper functions", () => {
  it("should throw if less than two segment", () => {
    expect(() => {
      targetFieldPathToParentPathAndSegment("a");
    }).toThrow();
    expect(configInvalidLogSpy).toHaveBeenCalled();
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

describe("fieldPathsChanged helper functins", () => {
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
    config = getConfigFromEnv();
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
    expect(sourceDocumentFieldChangedLogSpy).toHaveBeenCalledWith({
      lastname: { before: "Doe", after: "Smith" },
    });
  });
});

describe("updateObject helper functions", () => {
  const db = getFirestore();

  beforeAll(() => {
    // @ts-ignore override mocked config with default values because this suite do not interact with firestore
    config = {
      ...getConfigFromEnv(),
      sourceCollectionName: "firestore-d13n-helpers-updateObject-sources",
      targetCollectionNames: ["firestore-d13n-helpers-updateObject-targets"],
      sourceDenormalizeFunctionName: undefined,
      targetDocumentFields: ["user.id"],
    };
  });

  afterAll(async () => {
    // Clean up all documents
    await Promise.all([
      db.recursiveDelete(db.collection(config.sourceCollectionName)),
    ]);
  });

  it("should update target documents", async () => {
    const beforeData = {
      firstname: "John",
      lastname: "Doe",
    };
    const afterData = {
      firstname: "Jane",
      lastname: "Doe",
    };
    // Setup source document wiht after data as it will be passed to the updateObject function
    const sourceRef = db.collection(config.sourceCollectionName).doc();
    await sourceRef.set(afterData);
    const sourceSnapshot = await sourceRef.get();

    // Setup target document with before data
    const targetRef = db.collection(config.targetCollectionNames[0]).doc();
    await targetRef.set({
      user: {
        id: sourceRef.id,
        ...beforeData,
        someOtherData: true,
      },
    });

    await updateObject(sourceSnapshot);

    const targetSnapshot = await targetRef.get();

    expect(targetSnapshot.data()?.user.firstname).toEqual(afterData.firstname);
    expect(targetSnapshot.data()?.user.someOtherData).toEqual(true);
    expect(updateCompletedLogSpy).toHaveBeenCalledWith(1);
  });
});

describe("updateObject helper functions with user provided source denormalize function", () => {
  const db = getFirestore();
  const mockFetch = jest.fn();

  // @ts-ignore override mocked fetch function
  mock.method(global, "fetch", mockFetch);

  beforeAll(() => {
    // @ts-ignore override mocked config with default values because this suite do not interact with firestore
    config = {
      ...getConfigFromEnv(),
      sourceCollectionName: "firestore-d13n-helpers-updateObject-sources",
      targetCollectionNames: ["firestore-d13n-helpers-updateObject-targets"],
      sourceDenormalizeFunctionName: "denormalizeUser",
      targetDocumentFields: ["user.id"],
    };
  });

  afterAll(async () => {
    // Clean up all documents
    await Promise.all([
      db.recursiveDelete(db.collection(config.sourceCollectionName)),
    ]);
  });

  it("should update target documents", async () => {
    const beforeData = {
      firstname: "John",
      lastname: "Doe",
    };
    const afterData = {
      firstname: "Jane",
      lastname: "Doe",
    };
    const denormalizeUser = jest.fn().mockImplementation((data) => data);
    // Setup source document wiht after data as it will be passed to the updateObject function
    const sourceRef = db.collection(config.sourceCollectionName).doc();
    await sourceRef.set(afterData);
    const sourceSnapshot = await sourceRef.get();

    // Setup target document with before data
    const targetRef = db.collection(config.targetCollectionNames[0]).doc();
    await targetRef.set({
      user: {
        id: sourceRef.id,
        ...denormalizeUser(beforeData),
      },
    });

    mockFetch.mockImplementation(() => ({
      status: 200,
      ok: true,
      headers: {
        get: jest.fn().mockImplementation(() => "application/json"),
      },
      json: async () => ({
        result: { ...afterData, id: sourceRef.id, customData: true },
      }),
    }));

    await updateObject(sourceSnapshot);

    const targetSnapshot = await targetRef.get();

    expect(targetSnapshot.data()?.user.firstname).toEqual(afterData.firstname);
    // Custome data should be left untouched
    console.log(targetSnapshot.data());
    expect(targetSnapshot.data()?.user.customData).toEqual(true);
    expect(updateCompletedLogSpy).toHaveBeenCalledWith(1);
  });
});

describe("batchUpdate helper functions", () => {
  const db = getFirestore();

  const sourceDocRefs: DocumentReference[] = [];

  beforeAll(() => {
    // @ts-ignore override mocked config
    config = {
      ...getConfigFromEnv(),
      sourceCollectionName: "firestore-d13n-helpers-batchUpdate-sources",
      targetCollectionNames: ["firestore-d13n-helpers-batchUpdate-targets"],
    };
  });

  afterAll(async () => {
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
    expect(updateCompletedLogSpy).toHaveBeenCalledTimes(
      config.batchUpdateLimit + 1,
    );
  });
});
