import type * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import config from "./config";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { Change } from "firebase-functions/v2";

export const invalidEnvionmentVariables = (reason: string) =>
  logger.error(reason);

export const sourceDocumentFieldChanged = (
  changedPaths: Record<string, { before: unknown; after: unknown }>,
) => logger.log("Source document field changed", { changedPaths });

export const eventDataInvalid = (
  reason: string,
  data?: Change<QueryDocumentSnapshot>,
) => logger.warn("Event data invalid", { config, reason, data });

export const previousValueInvalid = (
  targetId: string,
  targetData: admin.firestore.DocumentData,
) =>
  logger.warn("Previous value invalid", {
    config,
    targetId,
    targetData,
  });

export const updateCompleted = (docUpdated: number) =>
  logger.log(`Update completed for ${docUpdated} documents`);

export const updateFailed = (
  reason: string,
  triggerDocId: string,
  after: unknown,
) => logger.error(reason, { triggerDocId, config, after });

export const configInvalid = (reason: string) =>
  logger.error(reason, { config });

export const backFillSourceCollectionCompleted = (
  sourceDocs: number,
  targetDocs: number,
) =>
  logger.log(
    `Resync all documents completed for collection ${config.sourceCollectionName}. Read ${sourceDocs} source documents and ${targetDocs} target documents`,
  );

export const backFillSourceCollectionFailed = (reason: string) =>
  logger.error(reason, { config });

export const denormalizeFunctionFailed = (
  url: string,
  status: number,
  statusText: string,
  headers: Headers,
) =>
  logger.error("Denormalize function failed", {
    url,
    status,
    statusText,
    headers,
  });
