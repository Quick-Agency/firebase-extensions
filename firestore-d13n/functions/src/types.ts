export interface Config {
  // Firebase variables
  instanceId: string;
  projectId: string;
  // User variables
  location: string;
  sourceCollectionName: string;
  sourceDocumentFields: string[];
  sourceDenormalizeFunctionName?: string;
  targetCollectionNames: string[];
  targetDocumentFields: string[];
  doBackfill: boolean;
  // Internal variables
  docIdWildcard: string;
  batchUpdateLimit: number;
}
