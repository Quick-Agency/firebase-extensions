import { targetFieldPathToParentPathAndSegment } from "../src/helpers";

describe("helpers", () => {
  it("targetFieldPathToParentPathAndSegment should throw if less than two segment", () => {
    expect(() => {
      targetFieldPathToParentPathAndSegment("a");
    }).toThrow();
  });

  it("targetFieldPathToParentPathAndSegment should return the parent path and segment path", () => {
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
