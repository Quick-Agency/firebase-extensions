const { onCall } = require("firebase-functions/v2/https");

exports.denormalizeUser = onCall(async (request, context) => {
  return {
    id: request.data.id,
    firstname: request.data.firstname,
    lastname: request.data.lastname,
    mobile: request.data.details.mobile,
  };
});
