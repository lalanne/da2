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
- `@react-native-firebase/app` plugin is configured with `ios.disableSPM: true`
  (see "iOS pod install: SPM vs static linkage" below).

### iOS pod install: SPM vs static linkage

The first `eas build --profile pilot --platform ios` failed in the
`Install pods` phase:

```
[!] [react-native-firebase] SPM + static linkage is not supported (target(s): Pods-da2).
```

react-native-firebase 26 resolves the Firebase iOS SDK via Swift Package
Manager by default (the reference project `chilaminas_android` is on RNFB 25,
which still used CocoaPods, so it never hit this). SPM's Firebase products are
automatic libraries, so with `use_frameworks! :linkage => :static` in the
Expo-generated Podfile — which `@react-native-google-signin/google-signin`
pulls in — each RNFB pod embeds its own copy of Firebase and they collide as
duplicate symbols at link time.

Fix: opt RNFB out of SPM back to CocoaPods resolution (which supports static
linkage). The RNFB config plugin does this by injecting
`$RNFirebaseDisableSPM = true` into the Podfile before the target block:

```json
["@react-native-firebase/app", { "ios": { "disableSPM": true } }]
```

The alternative — `use_frameworks! :linkage => :dynamic` — was not chosen: it
changes linkage for every pod and Google Sign-In has historically been
happier with static frameworks.

### Steps

1. **(interactive)** `eas build --profile pilot --platform ios`
   - Log in with the Apple ID (Apple Developer Program account).
   - When prompted, let EAS register the bundle identifier on the Apple
     Developer portal and manage the distribution certificate + provisioning
     profile.
2. **(interactive)** `eas submit --platform ios --profile pilot --latest`
   - Creates/links the App Store Connect app record for `com.lalanne.da2`
     and uploads the build to TestFlight.
   - Apple beta review: ~1 day for the first binary.
   - Once known, record `appleId` / `ascAppId` / `appleTeamId` in
     `eas.json` `submit.pilot.ios` so later submits are non-interactive.
3. In App Store Connect → TestFlight, add the father as a tester (internal if
   he has an Apple ID on the team, otherwise external — external adds a
   short extra review) or share the public TestFlight link.
4. Father: install TestFlight → accept invite → install `da2`.
5. Father runs spec 001 criteria 1–4 on the iPhone (Parent B role); tick them
   in `specs/001-auth.md`. Spec 001 is fully `verified` once they pass on
   both phones.

### Notes

- `ios.buildNumber` is unset, so it defaults to `1` for this first build.
  Later iOS binaries need it bumped (or add `autoIncrement` to the `pilot`
  profile) or TestFlight rejects the upload as a duplicate.
- If Apple's beta review flags the Google-only sign-in (Guideline 4.8), pull
  Sign in with Apple forward — the auth wrapper in spec 001 already isolates
  the change to `src/auth/`.
