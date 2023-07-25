Use this extension to keep your denormalized data in sync between source and target documents. The extenstion is configured for one source collection and one or more target collections.

The extension listens for update on specific fields of the source collection documents and will find any target document matching the source document id to update the denormalized data.


#### Target document
Target document will be query based on field path matching the source document id, for example `user.id`. 
```json
{
  "event": "Event name",
  "user":{
    "id": "NWxhvUgr5jFhljIWnlI3",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

Target field path also support dynamic segment that will be replace by the source document id, for example `speakers.{docId}.userId`. This allow for more complex use cases
```json
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

#### Denormalize data
By default the denormalize data will be updated in respect of the object found in the given fieldpath. Any key in the object that exist on the source document will be updated with the last value.

```json
// Source document for a user
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@mail.com",
  "details": {
    "mobile": "1234567890"
  }
}
```


```json
// Target document for an attendee to an event
{
  "event": "Event name",
  "user":{
    "id": "NWxhvUgr5jFhljIWnlI3",
    "firstname": "John", // Will be updated with new value
    "lastname": "Doe", // Will be updated with new value
    "type": "vip" // Will remain untouched
  }
}
```

#### Custom logic for denormalize data
An optional denormalize function name can be passed in the configuration. This function must :
- be an [https callable function](https://firebase.google.com/docs/functions/callable?gen=1st) (1st generation)
- be deployed on the same region as the firebae extension
- return the denormalized data

In this case the object found in the matching fieldpath is replace with return value.

**A https callable function to denormalize user data**
```typescript
export const denormalizeUser = functions
  .https.onCall((data) => {
    // data include a docId and docPath that can be use for custom logic
    return {
      firstname: data.firstname,
      lastname: data.lastname,
      mobile: data.details?.mobile,
    };
  });
```

**The resulting target document**
```json
{
  "event": "Event name",
  "user":{
    "id": "NWxhvUgr5jFhljIWnlI3",
    "firstname": "John", 
    "lastname": "Doe", 
    "mobile": "1234567890" 
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