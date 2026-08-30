# 001 — Authentication (Google Sign-In)

**Status:** approved
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

## Out of scope

- Sign in with Apple (required before iOS launch — tracked in 000).
- Email/password accounts.
