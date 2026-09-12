# 011 — Web platform

**Status:** implemented
**Depends on:** 001 (the auth-provider abstraction this reuses), 006
(deployment pattern). **Touches:** every data-layer file across 002–005 and
010 — no product screen changes.
**Followed by:** 012 (responsive web layout) — a desktop redesign built on
top of this once it's verified working. 011 ships the **same mobile UI**,
unmodified, in a browser; layout is explicitly out of scope here.

## User stories

- As a parent, I open a link in a browser and sign in, see the same
  household, calendar, events, receipts and expense split the phone app
  shows — the same account, the same real-time data.
- As a parent, a change I make on the phone (approve a proposal, share a
  receipt, confirm a payment) shows up on the web app without refreshing,
  and vice versa.

## Why this is mostly infrastructure, not new UI

Two decisions already in the codebase do most of the work:

- **No native-only UI.** Every screen is `View`/`Text`/`Pressable`/
  `ScrollView`/`Modal` + `StyleSheet` — no `react-native-svg`, no native
  slider, no icon font, no navigator (spec 007's "no native dependency"
  discipline). `react-native-web` renders all of it as-is.
- **Auth is already behind `src/auth/AuthProvider.ts`**, a provider-agnostic
  interface (built for Sign in with Apple) — a web implementation plugs into
  the same seam.

The actual blocker is narrow: `@react-native-firebase/*` and
`@react-native-google-signin/google-signin` are **native-only, no web
support**. Every file that imports them needs a web twin. That's it —
**exactly 7 files**:

```
src/auth/googleAuthProvider.ts
src/data/householdRepository.ts
src/data/custodyRepository.ts
src/data/eventsRepository.ts
src/data/receiptsRepository.ts
src/data/splitRepository.ts
src/data/userProfileRepository.ts
```

The `firebase` web SDK (`firebase: ^12.18.0`) is **already a dependency**
(today only for the Firestore-rules emulator tests) — no new package.

## Requirements

### Platform-specific files, not a rewrite

For each of the 7 files above, add a `*.web.ts` twin next to the existing
`*.ts`, implementing the **exact same exported interface** with the `firebase`
web SDK instead of `@react-native-firebase/*`. Metro (Expo's bundler) resolves
`X.web.ts` automatically for web builds and `X.ts` for native — **no store or
screen changes**; they all import `'./householdRepository'` etc. with no
extension, same as today.

- `TypeScript` does not itself understand the platform-suffix convention
  (`moduleSuffixes` isn't set in `expo/tsconfig.base`) — that's a Metro-only
  resolution rule. `tsc --noEmit` still type-checks each `X.web.ts` file on
  its own merits; the discipline is keeping its exported shape identical to
  `X.ts`. No tsconfig change needed.

### Firebase web app + config

- Register a **new Firebase Web App** under the `da2-coparenting` project
  (Firebase console → Project settings → Add app → Web). This is a distinct
  "app" registration from the existing Android/iOS ones and yields a
  standard `firebaseConfig` object (`apiKey`, `authDomain`, `projectId`,
  `storageBucket`, `appId`).
- A small `src/data/firebaseWebApp.ts` (web-only module, never imported by
  native code) calls `initializeApp(firebaseConfig)` once; every `*.web.ts`
  repository imports the same singleton instance from it. Native code has no
  equivalent — `@react-native-firebase` auto-initializes from
  `google-services.json` / `GoogleService-Info.plist`.
- Config values come in as new `EXPO_PUBLIC_FIREBASE_*` env vars (same
  convention as the existing `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). A Firebase
  web config is not a secret — access is enforced by Firestore/Storage rules,
  same as today — but it still goes through `EXPO_PUBLIC_*` so the pilot's
  `--environment preview` / production split keeps working.

### Auth on web

- `googleAuthProvider.web.ts`: Firebase Auth's `GoogleAuthProvider` +
  `signInWithPopup` (simplest, standard, keeps app state across sign-in — no
  full-page navigation). Session persistence: `browserLocalPersistence`
  (the web SDK default).
- Same `AuthProvider` interface (`signIn`, `signOut`, `onAuthStateChanged`,
  the mapped `AuthError` codes) — `authStore` doesn't change.

### Data — same rules, same backend, cross-platform by construction

- No Firestore or Storage **rules** changes — the same rules already
  evaluate `request.auth` regardless of which SDK wrote the request.
- No **data model** changes.
- Each `*.web.ts` repository re-implements its native twin's functions
  (`subscribeX`, `createX`, `resolveX`, …) with the `firebase/firestore` web
  SDK's `onSnapshot` / `addDoc` / `updateDoc` — same shapes in, same shapes
  out.

### Receipts — simpler on web, not a workaround

- **Upload:** `expo-image-picker` / `expo-document-picker` already support
  web (a browser `<input type=file>` under the hood) — verify the returned
  `PickedFile` shape (`size`, `mimeType`) matches; `receiptPicker.ts` itself
  imports neither RNFB nor Google Sign-In, so it may need no change at all.
- **Display:** native's "SDK-download-to-a-local-cache-file" step
  (`expo-file-system`) doesn't translate to a real filesystem on web. The web
  repository's `localFileUri` equivalent instead calls the Storage web SDK's
  `getDownloadURL()` and returns that **https URL directly** — the browser
  loads it into `<Image>` natively, and a PDF opens by `window.open(url)`
  instead of `expo-sharing`. This is less code than native, not more.

### Explicitly not part of 011

- **Push notifications** (spec 008) — web push is a different mechanism
  (service worker + an FCM web token) and depends on 008 landing first. The
  web app has no push for v1; proposals/events/receipts still show once the
  page is open, same as the phones do today without 008.
- **Layout / responsiveness** — 011 ships the identical mobile-width column,
  centered with neutral space on a wide window. Spec 012 does the redesign.
- **Sign in with Apple on web** — not required (only iOS per spec 001);
  `AuthProvider` leaves room for it later.

## Data model

No change. Same Firestore documents, same Storage objects, same rules —
the web app is a second client of the identical backend.

## Implementation notes

- **Hosting:** `npx expo export -p web` (static output, `dist/` by default
  in this Expo SDK) → `firebase.json` gains a `hosting` block pointing at
  that directory → `npx firebase deploy --only hosting`. Same project as the
  Firestore/Storage backend (`da2-coparenting`), so no new project, no CORS
  configuration needed for Storage.
- **`app.json`** gains an `expo.web` block (name, the existing app-icon
  assets reused for the web favicon — spec 003's icon work already produced
  these).
- **Deploy command reference** (mirrors spec 006's native-build table):
  ```
  npx expo export -p web
  npx firebase deploy --only hosting
  ```
- No changes to `eas.json` / the native build profiles — this is a wholly
  separate export path, not an EAS build.

## Acceptance criteria

1. **Given** a browser at the hosting URL, **when** a parent clicks
   "Continuar con Google", **then** they sign in via a Firebase Auth popup
   and land on the same household / main screen the phone app shows for that
   account.
2. **Given** a signed-in parent on web, **then** every tab (Calendario,
   Eventos, Recibos, Hogar) renders and behaves identically to the phone app:
   propose/approve a custody pattern or day override, add/edit a kid event,
   upload and share a receipt, propose/approve a split table, record and
   confirm a settlement.
3. **Given** a receipt shared from a phone, **when** the same parent opens
   the web app, **then** it appears in *Compartidos* and the image renders /
   the PDF opens via a direct Storage download URL — no native file-system
   dependency.
4. **Given** one parent on the native app and the other on web at the same
   time, **then** a change either makes (an approval, a share, a confirmed
   payment) appears on the other's screen in real time via the same
   Firestore listeners — no polling, no manual refresh.
5. **Given** the change set, **then** no Firestore or Storage rule changed,
   and no native module was added to the mobile app's dependency surface —
   the `firebase` web SDK dependency already existed.
6. **Given** `npm test` and `npm run typecheck`, **then** both stay green;
   the `*.web.ts` files are additive and never imported by native code or
   native tests.

## Verification plan

- **Unit:** none of the pure logic (`src/custody`, `src/events`, `src/split`,
  `src/receipts`, `src/i18n`) changes — the existing 213 unit tests are
  platform-agnostic and keep covering it. No new pure logic is introduced by
  this spec.
- **Manual, in a browser** (replaces "both pilot phones" for this spec):
  sign in as each parent in a separate browser profile; run through the
  criteria above end-to-end against the live `da2-coparenting` project;
  cross-check real-time sync against a phone running the current build.
- **Regression:** `npm test` + `npm run typecheck` stay green (criterion 6).

## Verification results

Implemented 2026-09-12. Live at <https://da2-coparenting.web.app>.

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1–4 (sign-in, feature parity, receipt files, real-time cross-platform sync) | ⏳ | Deployed; **pending a manual pass signed in as each parent** — see below. |
| 5 no rules/data-model change, no native dependency added | ✅ | `firestore.rules` / `storage.rules` untouched; `firebase` web SDK was already a dependency — only `react-native-web` + `react-dom` added (`expo install`), both web-only, never bundled into the native app. |
| 6 `npm test` / `npm run typecheck` stay green | ✅ | 213 unit tests + typecheck pass unchanged; jest-expo resolves the native `*.ts` files, never the `*.web.ts` twins. |

**What shipped:**
- `src/data/firebaseWebApp.ts` — the web `FirebaseApp` singleton, reading the
  new `EXPO_PUBLIC_FIREBASE_*` env vars.
- 7 `*.web.ts` twins (`googleAuthProvider`, `household`/`custody`/`events`/
  `receipts`/`split`/`userProfile` repositories) — same interface as the
  native file in each pair, `firebase` web SDK instead of
  `@react-native-firebase/*`. Confirmed by grepping the exported web bundle:
  zero references to `react-native-firebase` / `google-signin`.
- `googleAuthProvider.web.ts`: `signInWithPopup` + `browserLocalPersistence`.
- `receiptsRepository.web.ts`: upload reads the picker's `blob:` URI via
  `fetch().blob()` then `uploadBytes`; display returns `getDownloadURL()`
  directly (no local-file cache step). `ReceiptDetail`'s "Abrir PDF" branches
  on `Platform.OS === 'web'` to `window.open` instead of `expo-sharing`.
- Registered the Firebase Web App (`firebase apps:create WEB`), `firebase.json`
  `hosting` block (`dist`, SPA rewrite), deployed via
  `expo export -p web` + `firebase deploy --only hosting`.
- Spec 006 gained "Path C — Web".

**Manual verification — pending:** sign in as each parent in a separate
browser profile and run the full criteria-2 list (propose/approve custody,
kid events, receipts upload/share, split propose/approve, settlements),
cross-checked against a phone for real-time sync.

## Out of scope

- Responsive / desktop layout — spec 012.
- Web push notifications — depends on spec 008.
- Sign in with Apple on web.
- Offline support / service-worker caching beyond what `expo export -p web`
  provides by default.
- A custom domain for hosting (ships on the default `*.web.app` /
  `*.firebaseapp.com` URL; adding a custom domain later is a Firebase Hosting
  console step, not a code change).
