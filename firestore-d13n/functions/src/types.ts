export interface Config {
  // User variables
  location: string;
  sourceCollectionName: string;
  sourceDocumentFields: string[];
  targetCollectionNames: string[];
  targetDocumentFields: string[];
  doBackfill: boolean;
  // Internal variables
  docIdWildcard: string;
  batchUpdateLimit: number;
}
