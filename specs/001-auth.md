# 001 — Authentication (Google Sign-In)

**Status:** draft
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

## Out of scope

- Sign in with Apple (required before iOS launch — tracked in 000).
- Email/password accounts.
