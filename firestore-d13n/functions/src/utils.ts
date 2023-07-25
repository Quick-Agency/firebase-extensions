import type { Change } from "firebase-functions";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import config from "./config";
import * as log from "./logs";

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
