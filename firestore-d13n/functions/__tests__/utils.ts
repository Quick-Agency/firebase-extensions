export const getConfigFromEnv = () => ({
  instanceId: process.env.INSTANCE_ID as string,
  projectId: "demo-test",
  location: process.env.LOCATION as string,
  sourceCollectionName: process.env.SOURCE_COLLECTION_NAME as string,
  sourceDocumentFields: process.env.SOURCE_DOCUMENT_FIELDS?.split(
    ",",
  ) as string[],
  sourceDenormalizeFunctionName: process.env.SOURCE_DENORMALIZE_FUNCTION_NAME,
  targetCollectionNames: process.env.TARGET_COLLECTION_NAMES?.split(
    ",",
  ) as string[],
  targetDocumentFields: process.env.TARGET_DOCUMENT_FIELDS?.split(
    ",",
  ) as string[],
  doBackfill: process.env.DO_BACKFILL === "true",
  docIdWildcard: "{docId}",
  batchUpdateLimit: 10,
});
