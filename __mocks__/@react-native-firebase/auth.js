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
  // Spec 014 — email/password:
  createUserWithEmailAndPassword: jest.fn().mockRejectedValue(new Error('createUserWithEmailAndPassword is not mocked in this test')),
  signInWithEmailAndPassword: jest.fn().mockRejectedValue(new Error('signInWithEmailAndPassword is not mocked in this test')),
  sendPasswordResetEmail: jest.fn().mockRejectedValue(new Error('sendPasswordResetEmail is not mocked in this test')),
  sendEmailVerification: jest.fn().mockRejectedValue(new Error('sendEmailVerification is not mocked in this test')),
  updateProfile: jest.fn().mockRejectedValue(new Error('updateProfile is not mocked in this test')),
  reload: jest.fn().mockRejectedValue(new Error('reload is not mocked in this test')),
};
