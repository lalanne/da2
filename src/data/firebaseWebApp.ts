import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

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
  if (getApps().length > 0) return getApp();
  return initializeApp({
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
  });
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. See specs/011-web-platform.md.`);
  }
  return value;
}
