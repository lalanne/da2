# 006 — Pilot Deployment Pipeline

**Status:** draft
**Depends on:** 001 (first thing deployed is the auth build)

## Purpose

Every spec, feature, and bug fix — once local tests pass — is deployed to the
two real pilot phones:

| Device | User | Role |
|--------|------|------|
| Android phone | Mother | Parent A |
| iPhone | Father | Parent B |

One real household with **3 children**. This pilot household is the final
manual-verification environment: a spec is only marked `verified` after its
acceptance criteria pass on these phones.

## Distribution decisions

- **Apple Developer Program:** available (already enrolled).
- **iOS delivery: TestFlight.** Father installs the TestFlight app once; new
  binaries arrive automatically with a notification. First binary (and each
  new binary) passes Apple's light beta review (~1 day). JS-only updates
  bypass review entirely via EAS Update.
- **Android delivery: EAS internal distribution.** EAS builds an APK and
  produces an install link; mother taps the link to install/update. No Play
  Console until public launch.

## Two deployment paths

Most changes are JS/TS-only and take minutes; only native changes need new
binaries.

### Path A — OTA update (JS/TS-only changes: most specs and bug fixes)

```
npm test && eas update --channel pilot --message "<spec/fix description>"
```

Both phones download the update on next app launch (second launch runs the
new code). No review, no reinstall. Minutes end-to-end.

### Path B — New binaries (native changes)

Needed when: adding a native module, changing app config (permissions, icons,
`google-services.json` / `GoogleService-Info.plist`), or upgrading the Expo
SDK / runtime version.

```
eas build --profile pilot --platform all
eas submit --platform ios          # → TestFlight (beta review ~1 day)
# Android: send the EAS install link to the mother's phone
```

### Choosing the path

`runtimeVersion` uses the `appVersion` policy — every OTA update targets
phones on a matching `expo.version`, so a native change requires bumping
`version` (Path B) rather than silently half-updating one phone. When in
doubt, ship binaries.

(We first tried the `fingerprint` policy, which computes a hash of native
dependencies instead of relying on a manually bumped version. It sounds
more precise, but in practice EAS Build computes that hash once locally and
once on the remote worker and requires them to match exactly — and they
didn't, because `google-services.json`/`GoogleService-Info.plist` reach the
build differently in each place (local file vs. a materialized EAS secret).
Every `pilot` build failed at the "Configure expo-updates" phase with
"Runtime version calculated on local machine not equal to runtime version
calculated during build." `appVersion` has no such local/remote comparison,
so it doesn't hit this.)

## Standard per-change flow

1. Local gates: unit tests, rules tests (emulator), Maestro E2E — all green.
2. Deploy via Path A (default) or Path B (native change).
3. Confirm both phones run the new version (in-app version/update indicator —
   see requirements below).
4. Run the spec's manual checklist on both phones (both parent roles).
5. Update the spec's status to `verified` in `specs/README.md`.

## Requirements

- EAS project configured with a `pilot` build profile (internal distribution,
  Android APK, iOS release build) and a `pilot` update channel.
- The app shows its version + update id on the settings/about screen, so
  each phone can confirm "am I on the latest?" without guesswork.
- One Firebase project serves the pilot; it becomes production at public
  launch. Local development and automated tests use the Firebase emulators,
  never pilot data.
- The pilot household is real family data: no destructive migrations without
  a plan; test accounts must never be mixed into the pilot household.

## Risks / notes

- **App Store Guideline 4.8 (Sign in with Apple):** the pilot iOS build
  offers only Google Sign-In. Beta review is lighter than App Store review
  and usually tolerates this, but if Apple flags it, Sign in with Apple
  (already designed for in spec 001's auth wrapper) gets pulled forward.
- iOS binary changes cost ~1 day of beta review; plan native changes in
  batches rather than one-offs.

## Acceptance criteria

1. **Given** a merged JS-only change, **when** `eas update --channel pilot`
   runs, **then** both phones run the new code after two app launches, and
   the about screen shows the new update id on both.
2. **Given** a native change, **when** Path B completes, **then** the
   Android phone installs from the EAS link and the iPhone updates via
   TestFlight, both on the same runtime version.
3. **Given** an OTA update targeted at an incompatible runtime (a phone on
   an older `expo.version` than the update's), **then** it doesn't receive
   the update (runtime version mismatch blocks delivery).
4. **Given** the pilot household (2 parents, 3 children) on both phones,
   **then** a change made on one phone is visible on the other within
   seconds (end-to-end smoke test, repeated after every deployment).
5. Automated tests never touch the pilot Firebase project (verified by
   emulator-only test configuration).

## iOS pilot onboarding (one-time runbook)

The Android phone is live. This brings the father's iPhone onto the pilot.
Steps marked **(interactive)** need an Apple ID login and can't be scripted.

### Pre-checks (done)

- `eas.json` `pilot` profile sets `ios.distribution: "store"` (required for
  TestFlight) and resolves to the `preview` EAS environment, where
  `GOOGLE_SERVICE_INFO_PLIST` (file secret) and
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are configured.
- `app.json` sets `ios.bundleIdentifier` = `com.lalanne.da2` and
  `ios.googleServicesFile`. The bare `@react-native-google-signin/google-signin`
  plugin runs `IOSConfig.Google.withGoogle`, which reads
  `GoogleService-Info.plist` and appends its `REVERSED_CLIENT_ID` as the iOS
  URL scheme automatically — no extra plugin config needed.
- `GoogleService-Info.plist` is valid: `BUNDLE_ID` matches, `IS_SIGNIN_ENABLED`
  is true, `REVERSED_CLIENT_ID` present.
- `runtimeVersion` policy is `appVersion`; `expo.version` = `1.0.0`.
- Local gates green: `npm test` (13), `npm run typecheck`, `npm run test:rules`.
- iOS Firebase pods: `@react-native-firebase/app` plugin has
  `ios.disableSPM: true` and `expo-build-properties` sets
  `ios.useFrameworks: "static"` (see "iOS pod install" below for why).

### iOS pod install: SPM vs static linkage

The first `eas build --profile pilot --platform ios` failed in the
`Install pods` phase:

```
[!] [react-native-firebase] SPM + static linkage is not supported (target(s): Pods-da2).
```

It took three tries to get `pod install` to pass. The reference project
`chilaminas_android` is on RNFB 25 (CocoaPods) and is Android-only, so it was
no help here. Final working iOS config, built up one failure at a time:

**Try 1 — default config.** RNFB 26 resolves the Firebase iOS SDK via Swift
Package Manager by default. `pod install` failed:

```
[!] [react-native-firebase] SPM + static linkage is not supported (target(s): Pods-da2).
```

SPM's Firebase products are automatic libraries; under static pod linkage
each RNFB pod embeds its own copy of Firebase and they collide as duplicate
symbols. Fix: opt RNFB out of SPM back to CocoaPods resolution via the
config plugin, which injects `$RNFirebaseDisableSPM = true` into the Podfile:

```json
["@react-native-firebase/app", { "ios": { "disableSPM": true } }]
```

(`use_frameworks! :linkage => :dynamic` is the other way out, but it changes
linkage for every pod and Google Sign-In prefers static frameworks.)

**Try 2 — SPM disabled, no `use_frameworks!`.** Now `pod install` got further
("SPM disabled … using CocoaPods for Firebase dependencies") then failed:

```
[!] The following Swift pods cannot yet be integrated as static libraries:
The Swift pod `FirebaseAuth` depends upon `FirebaseAuthInterop` and
`FirebaseAppCheckInterop`, which do not define modules.
The Swift pod `FirebaseFirestore` depends upon `FirebaseFirestoreInternal`,
which does not define modules.
```

The Firebase Swift pods need Swift module maps to be importable, and the
default "static library" build doesn't generate them for the interop pods.
Fix: build pods as **static frameworks** (which always carry module maps) via
`expo-build-properties`:

```json
["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
```

This is the linkage RNFB's "SPM + static linkage is not supported" message was
about — but that check only fires when SPM is on, and Try 1 already turned it
off. `disableSPM: true` + `useFrameworks: "static"` is the combination RNFB's
docs call CocoaPods mode with static linkage, and it's supported.

### Steps

1. **(interactive)** `eas build --profile pilot --platform ios`
   - Log in with the Apple ID (Apple Developer Program account).
   - When prompted, let EAS register the bundle identifier on the Apple
     Developer portal and manage the distribution certificate + provisioning
     profile.
2. **(interactive)** `eas submit --platform ios --profile pilot --latest`
   - Creates/links the App Store Connect app record for `com.lalanne.da2`
     and uploads the build to TestFlight.
   - Prompts to generate an App Store Connect API Key (say yes, role ADMIN —
     the first run also creates the app record). The key is stored on EAS and
     reused, so later submits are non-interactive.
   - Apple processes the binary (~5–10 min, email on completion).
3. In App Store Connect → TestFlight, add the father as a tester:
   - **Internal** (fastest): add his Apple ID as a user on the team with the
     Developer or App Manager role, then add him to an internal testing
     group. No beta review; build is available as soon as processing ends.
   - **External**: create an external group, add his email; the first build
     needs Apple beta review (~1 day) plus a "what to test" note.
4. Father: install TestFlight → accept invite → install `da2`.
5. Father runs spec 001 criteria 1–4 on the iPhone (Parent B role); tick them
   in `specs/001-auth.md`. Spec 001 is fully `verified` once they pass on
   both phones.

### Notes

- Export compliance: `app.json` sets `ios.config.usesNonExemptEncryption` to
  `false` (the app only uses standard HTTPS/TLS via Firebase). This writes
  `ITSAppUsesNonExemptEncryption = NO` so TestFlight doesn't ask on every
  build. Revisit if custom cryptography is ever added.
- `ios.buildNumber` is unset, so it defaults to `1` for this first build.
  Later iOS binaries need it bumped (or add `autoIncrement` to the `pilot`
  profile) or TestFlight rejects the upload as a duplicate.
- App Store Connect app id: `6808989703`.
- If Apple's beta review flags the Google-only sign-in (Guideline 4.8), pull
  Sign in with Apple forward — the auth wrapper in spec 001 already isolates
  the change to `src/auth/`.
