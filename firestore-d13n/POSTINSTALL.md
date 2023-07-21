### See it in action

You can test out this extension right away:

1.  Go to [your source collection](https://console.firebase.google.com/project/${param:PROJECT_ID}/database/firestore/data/${param:SOURCE_COLLECTION_NAME}).
2.  Update one of the fields (${param:SOURCE_DOCUMENT_FIELDS})
3.  Check a document in one of the target collections (${param:TARGET_COLLECTION_NAMES}) for updated data

### Subcollection configuration

If your target collections includes any subcolleciton you'll need to add a [single field index](https://firebase.google.com/docs/firestore/query-data/index-overview#single-field_indexes) exemption for the extenstion to work.

For example, if you have a collection such as `events/{eventId}/conferences` where the target field path is `speakers.{docId}.userId`, the following configuration will add the required index.
```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "conferences",
      "fieldPath": "speakers",
      "ttl": false,
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "order": "DESCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        },
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION_GROUP"
        }
      ]
    }
  ]
}
```

### Test your extenstion


### Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.