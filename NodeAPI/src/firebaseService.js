// Optional Firebase adapter: use this if you switch from MongoDB to Firestore.
// Keep API contract unchanged so mobile/web clients do not break.

function notImplemented() {
  throw new Error('Firebase service not configured yet. Set up firebase-admin and service credentials.');
}

module.exports = {
  getCollection: notImplemented,
  createDoc: notImplemented,
  updateDoc: notImplemented,
  queryDocs: notImplemented
};
