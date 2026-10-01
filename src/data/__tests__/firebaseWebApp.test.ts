const mockInitializeApp = jest.fn(() => ({ name: '[DEFAULT]' }));
const mockGetApps = jest.fn(() => []);
const mockGetApp = jest.fn(() => ({ name: '[DEFAULT]' }));

jest.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApps: (...args: unknown[]) => mockGetApps(...args),
  getApp: (...args: unknown[]) => mockGetApp(...args),
}));

const mockGetAuthInstance = { kind: 'auth' };
const mockGetFirestoreInstance = { kind: 'firestore' };
const mockGetStorageInstance = { kind: 'storage' };

const mockGetAuth = jest.fn(() => mockGetAuthInstance);
const mockConnectAuthEmulator = jest.fn();
jest.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  connectAuthEmulator: (...args: unknown[]) => mockConnectAuthEmulator(...args),
}));

const mockGetFirestore = jest.fn(() => mockGetFirestoreInstance);
const mockConnectFirestoreEmulator = jest.fn();
jest.mock('firebase/firestore', () => ({
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  connectFirestoreEmulator: (...args: unknown[]) => mockConnectFirestoreEmulator(...args),
}));

const mockGetStorage = jest.fn(() => mockGetStorageInstance);
const mockConnectStorageEmulator = jest.fn();
jest.mock('firebase/storage', () => ({
  getStorage: (...args: unknown[]) => mockGetStorage(...args),
  connectStorageEmulator: (...args: unknown[]) => mockConnectStorageEmulator(...args),
}));

const ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;
const ORIGINAL_ENV: Record<string, string | undefined> = {};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockGetApps.mockReturnValue([]);
  for (const key of ENV_KEYS) {
    ORIGINAL_ENV[key] = process.env[key];
    process.env[key] = `fake-${key}`;
  }
  delete process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    process.env[key] = ORIGINAL_ENV[key];
  }
  delete process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR;
});

// Regression guard for spec 016: the e2e harness only works if setting this
// flag actually points the web app at the local emulators, and — just as
// important — the flag being unset (every real deploy) must NEVER connect
// to an emulator by accident.
describe('webApp() emulator connection (spec 016)', () => {
  it('never connects to an emulator when the flag is unset', () => {
    const { webApp } = require('../firebaseWebApp');
    webApp();

    expect(mockConnectAuthEmulator).not.toHaveBeenCalled();
    expect(mockConnectFirestoreEmulator).not.toHaveBeenCalled();
    expect(mockConnectStorageEmulator).not.toHaveBeenCalled();
  });

  it('never connects to an emulator when the flag is any value other than the literal string "true"', () => {
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR = 'false';
    const { webApp } = require('../firebaseWebApp');
    webApp();

    expect(mockConnectAuthEmulator).not.toHaveBeenCalled();
  });

  it('connects Auth, Firestore and Storage to the local emulators when the flag is "true"', () => {
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
    const { webApp } = require('../firebaseWebApp');
    webApp();

    expect(mockConnectAuthEmulator).toHaveBeenCalledWith(
      mockGetAuthInstance,
      'http://127.0.0.1:9099',
      expect.anything(),
    );
    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(
      mockGetFirestoreInstance,
      '127.0.0.1',
      8080,
    );
    expect(mockConnectStorageEmulator).toHaveBeenCalledWith(
      mockGetStorageInstance,
      '127.0.0.1',
      9199,
    );
  });

  it('connects only once even when webApp() is called many times', () => {
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
    const { webApp } = require('../firebaseWebApp');
    webApp();
    webApp();
    webApp();

    expect(mockConnectFirestoreEmulator).toHaveBeenCalledTimes(1);
  });
});
