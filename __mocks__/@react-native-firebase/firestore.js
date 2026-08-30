// Manual mock: the real native module isn't available under Jest.
// Tests that touch Firestore override these with jest.mock().
module.exports = {
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn().mockRejectedValue(new Error('getDoc is not mocked in this test')),
  setDoc: jest.fn().mockRejectedValue(new Error('setDoc is not mocked in this test')),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
};
