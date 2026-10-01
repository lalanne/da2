import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

/**
 * The web Firebase app singleton (spec 011). Only ever imported by `*.web.ts`
 * repositories / providers, so it's only ever bundled into the web build —
 * native builds use `@react-native-firebase/*`'s auto-init from
 * `google-services.json` / `GoogleService-Info.plist` instead.
 *
 * Every `process.env.EXPO_PUBLIC_*` reference below must stay a *static*
 * member expression, literally written out — Expo's babel plugin only
 * inlines the build-time value for exactly that shape. A helper that takes
 * the var name as a string (`process.env[name]`) is invisible to it, so it
 * never gets replaced and is simply `undefined` in the browser bundle. (This
 * shipped broken once already — a blank page, `apiKey` undefined.)
 */
export function webApp(): FirebaseApp {
  const app = getApps().length > 0 ? getApp() : initializeApp(buildConfig());
  connectEmulatorsIfNeeded(app);
  return app;
}

function buildConfig() {
  return {
    apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: requireEnv(
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    projectId: requireEnv(
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    storageBucket: requireEnv(
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: requireEnv(
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  };
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. See specs/011-web-platform.md.`);
  }
  return value;
}

let emulatorsConnected = false;

/**
 * Spec 016 — the e2e harness builds the web app with
 * `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` and points it at the local
 * Firebase emulators instead of the real `da2-coparenting` project. Every
 * `*.web.ts` file gets Auth/Firestore/Storage through `webApp()` (directly
 * or via `getAuth(webApp())` etc.), so connecting here — once, before
 * anything else touches these services — covers all of them with no change
 * to the repositories/providers themselves. Ports match `firebase.json`'s
 * `emulators` block. Guarded by a module-level flag because
 * `connect*Emulator` throws if called twice on the same instance, and
 * `webApp()` is called on every repository call, not just once at startup.
 */
function connectEmulatorsIfNeeded(app: FirebaseApp): void {
  if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR !== 'true' || emulatorsConnected) return;
  emulatorsConnected = true;
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
  connectStorageEmulator(getStorage(app), '127.0.0.1', 9199);
}
