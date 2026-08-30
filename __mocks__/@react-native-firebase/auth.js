// Manual mock: the real native module isn't available under Jest.
// Tests that need specific auth behavior override these with jest.mock().
module.exports = {
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(() => () => {}),
  signInWithCredential: jest.fn().mockRejectedValue(new Error('signInWithCredential is not mocked in this test')),
  signOut: jest.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: {
    credential: jest.fn((idToken) => ({ idToken })),
  },
};
