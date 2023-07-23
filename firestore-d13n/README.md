# Quick Agency firestore-d13n

**Author**: Quick Agency (**[https://quick.agency](https://quick.agency)**)

**Description**: Automate your denormalization updates across all your collections in Firestore.



**Details**: Use this extension to keep your denormalized data in sync between source and target documents. The extenstion is configured for one source collection and one or more target collections.

The extension listens for update on specific fields of the source collection documents and will find any target document matching the source document id to update the denormalized data.

Target document will be query based on field path matching the source document id, for example `user.id`. Target field path also support dynamic segment that will be replace by the source document id, for example `speakers.{docId}.userId`. This allow for multiple use cases:
```json
// Attendee document linked to one and only one user, target path : 'user.id'
{
  "event": "Event name",
  "user":{
    "id": "NWxhvUgr5jFhljIWnlI3",
    "firstname": "John",
    "lastname": "Doe"
  }
}

// Confernce document linked to one or more user, target path : 'speakers.{docId}.userId'
{
  "name": "Conference name",
  "speakers":{
    "NWxhvUgr5jFhljIWnlI3": {
      "userId": "NWxhvUgr5jFhljIWnlI3",
      "firstname": "John",
      "lastname": "Doe"
    },
    "v1yBHAHn7uKX3xE9JhPq":{
      "userId": "NWxhvUgr5jFhljIWnlI3",
      "firstname": "Jane",
      "lastname": "Doe"
    }
  }
}
```


#### Important

The extension support subcollection by using [collection group query](https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query), such queries will require a [single field index](https://firebase.google.com/docs/firestore/query-data/index-overview#single-field_indexes) exemption to work.

In the previous exemple if the conference collection is a sub collection of events, this will require the following configuration for Firestore index : 
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

#### Additional setup

Before installing this extension, make sure that you've
[set up a Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart)
in your Firebase project.

#### Billing

This extension uses other Firebase or Google Cloud services which may have associated charges:

- Google Cloud Tasks
- Cloud Firestore
- Cloud Functions

This extension also uses the following third-party services:

- Algolia ([pricing information](https://www.algolia.com/pricing))

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier billing plan is only required if the extension uses a service that requires a paid-tier plan, for example calling to a Google Cloud API or making outbound network requests to non-Google services. All Firebase services offer a no-cost tier of usage.
[Learn more about Firebase billing.](https://firebase.google.com/pricing)



**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Source collection name: The source collection name to listen for document update

* Source document fields: A comma separated list of field paths on the source document that will trigger the update of denormalized data in the target collections

* Target collection names: A comma separated list of collection names of document where the denormalized data will be updated This collection names will be used in collection group query, not as path

* Target document fields: The target document field path to a matching id of the source document

* Resync existing documents: Resync all existing documents in the source collection



**Cloud Functions:**

* **onUpdate:** Firestore trigger onUpdate to updates document in target collections

* **backFillSourceCollection:** Resync existing documents in the trigger collection on installation



**APIs Used**:

* firestore.googleapis.com (Reason: Read and update document in Firetore)

* cloudtasks.googleapis.com (Reason: Create task queue to resync existing documents on installation)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows this extension to access Cloud Firestore to read document in the trigger collection and update document in the target collections)
