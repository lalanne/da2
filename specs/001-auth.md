# 001 — Authentication (Google Sign-In)

**Status:** verified
**Depends on:** 000

## User stories

- As a parent, I sign in with my existing Google account so I don't have to
  create yet another account.
- As a returning parent, I open the app and I'm already signed in.
- As a parent, I can sign out.

## Requirements

- Google Sign-In via Firebase Auth is the only provider in v1.
- The auth layer is wrapped behind our own interface (`AuthProvider`) so that
  adding Sign in with Apple later touches only the wrapper, not the screens.
- On first sign-in, a `users/{uid}` profile document is created with name,
  email, and photo from the Google profile.
- Session persists across app restarts (Firebase Auth default persistence).

## Acceptance criteria

1. **Given** a signed-out user on the welcome screen, **when** they tap
   "Continue with Google" and complete the Google flow, **then** they land on
   the app's main screen and a `users/{uid}` document exists.
2. **Given** a signed-in user, **when** they force-close and reopen the app,
   **then** they are still signed in (no login screen).
3. **Given** a signed-in user, **when** they tap "Sign out", **then** they
   return to the welcome screen and protected data is no longer readable.
4. **Given** a user who cancels the Google flow, **then** they remain on the
   welcome screen with no error crash and no partial account created.
5. Firestore security rules reject all reads/writes from unauthenticated
   clients.

## Data model

```
users/{uid}
  displayName: string
  email: string
  photoUrl: string | null
  householdId: string | null   // set by spec 002
  createdAt: timestamp
```

## Verification plan

> **This is the original plan, written before the app had a web platform
> (spec 011) — read it as native-only, and see the 2026-10-17 amendment at
> the end of Verification results for what actually covers each criterion
> today.** Its Maestro E2E layer was never built; the automated E2E layer
> that exists is Playwright on web (spec 016), which is a *different
> platform*, not a substitute for this one.

Test infrastructure set up as part of this spec (and reused by all later
specs): Jest + `jest-expo` + React Native Testing Library for unit tests,
Firebase Emulator Suite + `@firebase/rules-unit-testing` for security rules
tests, Maestro on an Android emulator for E2E flows.

The real Google account picker (Google's native UI) is impractical to
automate; E2E runs point the app at the **Firebase Auth emulator**, which
substitutes a fake sign-in screen. The genuine Google flow is covered by a
short manual checklist on a real device.

| Criterion | Layer | How |
|-----------|-------|-----|
| 1 — sign-in creates profile, lands on main | E2E (Auth emulator) + manual | Maestro: welcome → sign-in → main screen, assert `users/{uid}` exists. Manual: real Google flow once per release. |
| 2 — session persists across restart | E2E (Auth emulator) | Maestro: sign in, kill app, relaunch, assert main screen (no login). |
| 3 — sign-out returns to welcome, data unreadable | Unit + E2E | Unit: wrapper clears state; rules test: signed-out context loses read access. Maestro: tap sign-out → welcome screen. |
| 4 — cancel leaves clean state | Unit + manual | Unit: wrapper's cancel path creates no profile doc, no error state. Manual: cancel the real Google dialog. |
| 5 — rules reject unauthenticated access | Rules tests (fully automated) | `rules-unit-testing`: unauthenticated read/write of `users/*` denied; authed user can read/write only own doc. |

CI runs unit + rules + E2E layers on every push. Manual checklist items are
ticked in the PR/release notes before the spec is marked `verified`.

## Verification results

Verified on both pilot phones plus the automated suites: the **Android** phone
(Parent A) on 2026-09-03, and the **iPhone** (Parent B, via TestFlight build
1.0.0 (1)) on 2026-09-05. The Maestro/Auth-emulator E2E layer was not built
for this spec — criteria 1, 2 and 4 were checked manually on the real devices
instead, and criteria 3 and 5 by the unit + rules suites. (That harness was
never built, and "Maestro" is no longer a standing decision — see the
amendment below.)

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1 — sign-in creates profile, lands on main | ✅ | Real Google sign-in on both phones; main screen shown; `users/{uid}` created via first-sign-in path (Android: "Hi, Javiera Moreno Cruz"; iOS: father's account). |
| 2 — session persists across restart | ✅ | Force-closed and reopened on both phones — still signed in, no login screen. |
| 3 — sign-out returns to welcome, data unreadable | ✅ | Manual: sign-out returns to welcome on both phones. Unit: wrapper clears auth state on sign-out. Rules test: signed-out context denied reads of `users/*`. |
| 4 — cancel leaves clean state | ✅ | Sign-out → sign-in → cancel the Google dialog on both phones: returned to welcome, no crash, no partial profile. Unit test covers the cancel path. |
| 5 — rules reject unauthenticated access | ✅ | `firebase/tests/**` rules suite: unauthenticated read/write of `users/*` denied; authed user limited to own doc. |

### Amendment 2026-10-17 — verification now has a platform dimension

Found during a spec-by-spec audit. The plan above assumed one platform, so
it classified verification by *layer* (unit / rules / E2E / manual). Since
spec 011 the app ships on two, with a **separate implementation of the auth
path on each** — `googleAuthProvider.ts` (the `@react-native-google-signin`
SDK fetching an ID token, exchanged with Firebase) and
`googleAuthProvider.web.ts` (`signInWithPopup`). A criterion can now be
covered on one platform and untouched on the other, which the single-axis
table above cannot express.

Spec 016's Playwright suite is a real automated E2E layer for this spec —
but on **web**. It does not discharge any native criterion, and it is not
the Maestro plan arriving late.

| Criterion | Web | Native (Android/iOS) |
|-----------|-----|----------------------|
| 1 — sign-in creates profile, lands on main | **Partial.** `e2e/tests/smoke.spec.ts` reaches the main screen on every push — but via spec 014's email/password form, not this spec's Google provider, and it never asserts `users/{uid}`. Google popup: [#47](https://github.com/lalanne/da2/issues/47). Profile doc: [#40](https://github.com/lalanne/da2/issues/40). | Manual only (2026-09-03 / 2026-09-05). |
| 2 — session persists across restart | **None.** Proposed in [#40](https://github.com/lalanne/da2/issues/40) as a page reload. Note this is a *different mechanism* from native's — browser local persistence vs RNFB's native store — so covering it on web leaves the native criterion exactly where it is. | Manual only. |
| 3 — sign-out returns to welcome, data unreadable | **Covered.** `smoke.spec.ts` (sign-out → welcome) + `firebase/tests/users.rules.test.ts` (rules, platform-independent). | Manual, plus a native-only wrinkle with no automated coverage on either platform: RNFB re-emits `null` on app resume, debounced in `App.tsx`. |
| 4 — cancel leaves clean state | **None.** Drivable against the Auth emulator's popup (open, close, assert `signInCancelled`) — the same fake-login substitute this spec's original plan already called for. Rides with [#47](https://github.com/lalanne/da2/issues/47). | Manual, plus a unit test of the cancel branch in `googleAuthProvider.test.ts`. |
| 5 — rules reject unauthenticated access | **Covered**, platform-independent. | Same. |

Two consequences worth stating plainly:

- **The native evidence is aging.** Those manual checks were run against
  build `1.0.0 (1)`. The auth surface has changed since — spec 014 added a
  second provider and an email-verification gate, and two post-015 auth
  fixes landed on top. Nobody has re-run this checklist on the current
  build.
- **Automated native coverage is an open decision, not a plan.** Spec 016
  rules it out of scope; whether to build it at all, and with what harness,
  is [#56](https://github.com/lalanne/da2/issues/56) (proposed as spec 017).
  Until that is settled, criteria 1, 2 and 4 are native-manual and nothing
  in CI protects them.

Where the mapping lives: **spec 016 owns e2e coverage**, tracked per spec in
its Coverage section (this spec is item 1, `smoke.spec.ts`). This table
records the platform split and points there, rather than duplicating a
coverage list that would drift.

## Out of scope

- Sign in with Apple (required before iOS launch — tracked in 000).
- Email/password accounts → **spec 014**.
