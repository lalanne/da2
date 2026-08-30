// Manual mock: the real native module isn't available under Jest.
// Tests that need specific sign-in behavior override these with jest.mock().
module.exports = {
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockRejectedValue(new Error('GoogleSignin.signIn is not mocked in this test')),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
  isCancelledResponse: (response) => response?.type === 'cancelled',
  isSuccessResponse: (response) => response?.type === 'success',
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
};
