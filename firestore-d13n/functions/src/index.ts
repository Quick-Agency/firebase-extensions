import * as functions from "firebase-functions";
import { getFunctions } from "firebase-admin/functions";
import { getExtensions } from "firebase-admin/extensions";
import config from "./config";
import * as log from "./logs";
import { batchUpdate, updateObject } from "./helpers";
import { fieldPathsChanged } from "./utils";

export const onUpdate = functions
  .region(config.location)
  .firestore.document(config.sourceCollectionName)
  .onUpdate(async (change) => {
    if (fieldPathsChanged(change)) {
      const collectionNames = config.targetCollectionNames;
      const targetDocumentFields = config.targetDocumentFields;

      if (collectionNames.length !== targetDocumentFields.length) {
        const errMsg = `Collection names (${collectionNames.length} elements) and target field paths (${targetDocumentFields.length} elements) must have the same number of elements`;
        log.configInvalid(errMsg);
        throw new Error(errMsg);
      }

      await updateObject(change.after);
      return;
    }
  });

export const backFillSourceCollection = functions
  .region(config.location)
  .tasks.taskQueue({
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 5,
    },
    rateLimits: {
      maxConcurrentDispatches: 1000,
      maxDispatchesPerSecond: 500,
    },
  })
  .onDispatch(async (data) => {
    const runtime = getExtensions().runtime();
    if (!config.doBackfill) {
      await runtime.setProcessingState(
        "PROCESSING_COMPLETE",
        "Resync all documents skipped",
      );
      return;
    }

    try {
      const results = await batchUpdate({
        startAfterDocId: data.startAfterDocId,
        sourceDocs: data.sourceDocs,
        targetDocs: data.targetDocs,
      });

      if (results.done) {
        log.backFillSourceCollectionCompleted(
          results.sourceDocs,
          results.targetDocs,
        );
        await runtime.setProcessingState(
          "PROCESSING_COMPLETE",
          `Resync all documents completed. ${results.targetDocs} target documents updated`,
        );
        return;
      }

      const queue = getFunctions().taskQueue(
        `locations/${config.location}/functions/backFillSourceCollection`,
        process.env.EXT_INSTANCE_ID,
      );
      return queue.enqueue(results);
    } catch (error) {
      const errMsg =
        "An unknown error occurred while resyncing all documents, please refer to the logs for more details";
      log.backFillSourceCollectionFailed(errMsg);
      await runtime.setProcessingState("PROCESSING_FAILED", errMsg);
      throw error;
    }
  });
