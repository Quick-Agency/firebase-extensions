import { type Change } from "firebase-functions";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  fieldPathsChanged,
  targetFieldPathToParentPathAndSegment,
} from "../src/utils";
import { getConfigFromEnv } from "./utils";
// @ts-ignore config is imported to be mocked
import config from "../src/config"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as logs from "../src/logs";

// Mock config module to override environment variables and avoid conflict with e2e tests
jest.mock("../src/config", () => ({
  __esModule: true,
  default: null,
}));

// Mock logs module to validate logs and avoid logging in tests
const sourceDocumentFieldChangedLogSpy = jest
  .spyOn(logs, "sourceDocumentFieldChanged")
  .mockImplementation();
const configInvalidLogSpy = jest
  .spyOn(logs, "configInvalid")
  .mockImplementation();

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
