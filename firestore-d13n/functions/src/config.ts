import { Config } from "./types";
const config: Config = {
  instanceId: process.env.EXT_INSTANCE_ID as string,
  projectId: process.env.PROJECT_ID as string,
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
};

export default config;
// import * as logs from "./logs";

// let config: Config | undefined;

// // Config must be initialized when called to be sure that user varaibles are set up in the environment
// export const getConfig = (): Config => {
//   if (config) {
//     return config;
//   }

//   const {
//     LOCATION,
//     SOURCE_COLLECTION_NAME,
//     SOURCE_DOCUMENT_FIELDS,
//     TARGET_COLLECTION_NAMES,
//     TARGET_DOCUMENT_FIELDS,
//     DO_BACKFILL,
//   } = process.env;

//   if (typeof LOCATION !== "string") {
//     const reason = "LOCATION must be a string";
//     logs.invalidEnvionmentVariables(reason);
//     throw new Error(reason);
//   }
//   const location = LOCATION;

//   if (typeof SOURCE_COLLECTION_NAME !== "string") {
//     const reason = "SOURCE_COLLECTION_NAME must be a string";
//     logs.invalidEnvionmentVariables(reason);
//     throw new Error(reason);
//   }
//   const sourceCollectionName = SOURCE_COLLECTION_NAME;

//   if (typeof SOURCE_DOCUMENT_FIELDS !== "string") {
//     const reason = "SOURCE_DOCUMENT_FIELDS must be a string";
//     logs.invalidEnvionmentVariables(reason);
//     throw new Error(reason);
//   }
//   const sourceDocumentFields = SOURCE_DOCUMENT_FIELDS.split(",");

//   if (typeof TARGET_COLLECTION_NAMES !== "string") {
//     const reason = "TARGET_COLLECTION_NAMES must be a string";
//     logs.invalidEnvionmentVariables(reason);
//     throw new Error(reason);
//   }
//   const targetCollectionNames = TARGET_COLLECTION_NAMES.split(",");

//   if (typeof TARGET_DOCUMENT_FIELDS !== "string") {
//     const reason = "TARGET_DOCUMENT_FIELDS must be a string";
//     logs.invalidEnvionmentVariables(reason);
//     throw new Error(reason);
//   }
//   const targetDocumentFields = TARGET_DOCUMENT_FIELDS.split(",");

//   config = {
//     // User variables
//     location,
//     sourceCollectionName,
//     sourceDocumentFields,
//     targetCollectionNames,
//     targetDocumentFields,
//     doBackfill: DO_BACKFILL === "true",
//     // Internal variables
//     docIdWildcard: "{docId}",
//     batchUpdateLimit: 10,
//   };

//   return config;
// };
