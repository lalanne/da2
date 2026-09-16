# 014 — Email/password accounts

**Status:** implemented
**Depends on:** 001 (extends the auth layer; `AuthProvider` stays untouched,
a sibling interface is added)

## User stories

- As a parent without (or who doesn't want to use) a Google account, I create
  an account with my email and a password of my choice.
- As a returning parent who signed up with email/password, I sign back in
  with that email and password.
- As a parent who forgot their password, I reset it via a link emailed to me.
- As a parent, I'm asked to confirm my email address is really mine before I
  can start using the app — a wrong or fake email in a shared-custody app is
  a real problem, not just a nuisance.

## Requirements

### Provider architecture

- `AuthProvider` (the existing interface — parameterless `signIn()`, used by
  Google and, later, Apple) is **unchanged**. A new sibling interface,
  `EmailAuthProvider`, is added for the credential-based flow:
  ```ts
  interface EmailAuthProvider {
    signUp(name: string, email: string, password: string): Promise<AuthUser>;
    signIn(email: string, password: string): Promise<AuthUser>;
    sendPasswordReset(email: string): Promise<void>;
    resendVerificationEmail(): Promise<void>;
    /** Firebase doesn't push `emailVerified` changes live — call after the
     * user confirms they clicked the link, to re-check. */
    reloadCurrentUser(): Promise<AuthUser | null>;
  }
  ```
  Implemented as `src/auth/emailAuthProvider.ts` (native,
  `@react-native-firebase/auth`) + `emailAuthProvider.web.ts` (the `firebase`
  web SDK), same per-platform pattern spec 011 already established for the
  repositories.
- `createAuthStore` takes both providers. Both drive the **same** `user`
  state via the Google provider's existing `onAuthStateChanged` — it's one
  underlying Firebase Auth instance regardless of which method signed in, so
  no second listener is needed.
- `AuthUser` gains `emailVerified: boolean`. Google (and later Apple)
  sign-ins already come back `emailVerified: true` from Firebase — no change
  to their behavior.

### Sign-up

- One screen, `EmailAuthScreen`, reached from `WelcomeScreen` via a
  secondary "Continuar con tu correo" action below the existing Google
  button. It has a mode toggle: **Crear cuenta** / **Iniciar sesión**.
- Sign-up fields: **name**, **email**, **password** (all required). Email
  and Google sign-in have no name to pull a display name from, unlike
  Google — the user types it, and it's written to the Firebase Auth profile
  (`updateProfile`) so `AuthUser.displayName` behaves identically to
  Google's from then on (same field every screen already reads).
- **Password rule:** minimum 8 characters, checked client-side before
  submitting (Firebase's own floor is 6). No further complexity
  requirements in v1 — a length floor plus a strength hint in the UI, not a
  regex gate that locks people out of their own reasonable passwords.
- On success: Firebase creates the account and signs the user in
  immediately (`emailVerified: false`); a verification email is sent right
  away (`sendEmailVerification`); `ensureUserProfile` runs exactly as it
  does for Google (same `users/{uid}` shape — no schema change).
- **`auth/email-already-in-use`** (including an email that already has a
  Google account) surfaces a specific message pointing at "Iniciar sesión"
  or "Continuar con Google" instead of the generic error — this is the one
  case worth a tailored message, since the generic one would be actively
  misleading.

### Sign-in

- Same screen, "Iniciar sesión" mode: email + password, submit. Wrong
  password / unknown email map to one combined "correo o contraseña
  incorrectos" message (never reveal which one was wrong — standard
  practice, avoids confirming whether an email has an account).
- "¿Olvidaste tu contraseña?" link (visible only in this mode) opens a small
  inline sub-view: email field, submit calls
  `sendPasswordReset`. **Always** shows the same confirmation regardless of
  whether the account exists ("Si existe una cuenta con ese correo, te
  enviamos un enlace para restablecer tu contraseña.") — don't let this
  become an email-enumeration oracle.

### Email verification gate

- `App.tsx`'s top-level routing gains one more state: signed in, but
  `!user.emailVerified` → a new `VerifyEmailScreen`, shown **before**
  household routing (so an unverified user never reaches household data).
  Content: "Revisa tu correo" + the address, "Reenviar correo" (calls
  `resendVerificationEmail`, rate-limited by Firebase itself), "Ya
  verifiqué mi correo" (calls `reloadCurrentUser`, re-checks
  `emailVerified`, and proceeds once true), and a "Cerrar sesión" escape
  hatch for a mistyped email.
- Applies uniformly to every account, but in practice only ever gates
  email/password sign-ups — Google accounts arrive already verified.

### Firestore & Storage rules

- **Enforced server-side, not just in the UI** — per this repo's standing
  rule that security lives in rules. `firestore.rules`' single `signedIn()`
  helper (already the gate behind all 16 uses across every collection) gets
  one added clause: `request.auth.token.email_verified == true`. One change
  point covers every collection at once.
- `storage.rules`' `member()` helper gets the same clause added.
- **Rollout care:** this changes behavior for the pilot's *existing*,
  already-in-use Google accounts too (even though their tokens should
  already carry `email_verified: true`). Verify against both pilot phones'
  real tokens in the emulator/manually **before** deploying — see
  Verification plan.

### Existing copy that goes stale

- `strings.auth.googleHint` ("Usa tu cuenta de Google. No creamos otra
  contraseña.") becomes false the moment this ships — update it (and add
  the new screen's copy) in the same change.

## Data model

No new collections. `users/{uid}` is unchanged (spec 001's shape already
covers it — `email` was always there). No Firestore field records the
verification state; it's read live off the Firebase Auth token
(`request.auth.token.email_verified`), not stored data.

## Acceptance criteria

1. **Given** the welcome screen, **when** a parent taps "Continuar con tu
   correo" → "Crear cuenta" and submits a valid name/email/8+-char
   password, **then** the account is created, a verification email is
   sent, and they land on `VerifyEmailScreen` (not the main app).
2. **Given** an unverified account, **when** they haven't clicked the
   email link, **then** they cannot reach household data — client routing
   shows `VerifyEmailScreen`, and a direct Firestore read/write attempt is
   denied by rules regardless of UI.
3. **Given** `VerifyEmailScreen`, **when** the parent clicks the emailed
   link and then taps "Ya verifiqué mi correo", **then** they proceed to
   household onboarding / the main app (whichever spec 002's routing
   already resolves to).
4. **Given** valid email/password credentials for an existing account,
   **when** they submit "Iniciar sesión", **then** they land on the app
   exactly as a Google sign-in would (main screen if in a household,
   onboarding if not).
5. **Given** a wrong password or an unregistered email, **then** one
   generic "correo o contraseña incorrectos" error is shown — no hint as
   to which.
6. **Given** "¿Olvidaste tu contraseña?" with any email typed in, **then**
   the same confirmation message is shown whether or not that email has an
   account, and a real account receives a reset email.
7. **Given** a sign-up with an email that already has an account (Google or
   email/password), **then** a specific "ya existe una cuenta con este
   correo" message is shown — not the generic error.
8. **Given** a Google-signed-in parent (existing behavior), **then**
   nothing changes — they never see `VerifyEmailScreen`, sign-in is
   unaffected.
9. **Firestore & Storage rules:** an authenticated-but-unverified token is
   denied read/write on every collection/object the same way a signed-out
   request is; a verified token (Google or verified email/password) behaves
   exactly as today.

## Verification plan

- **Unit:** password length validation; error-code → message mapping
  (`auth/email-already-in-use`, `auth/wrong-password`, `auth/user-not-found`
  collapsed to one message, `auth/weak-password`, `auth/invalid-email`,
  `auth/too-many-requests`); the sign-up → verification-email → gated-state
  sequence in the store (mocked provider).
- **Rules (emulator):** unverified-but-authed context denied across a
  representative collection from each existing spec (users, households,
  custody proposals, events, receipts, split); verified context unaffected
  — this is the regression check for the `signedIn()` change reaching every
  spec built so far.
- **Manual, both pilot phones, before deploying rules:** confirm each
  phone's real, already-signed-in Google session still has
  `email_verified: true` on its current ID token (decode it or check via
  the Firebase console/logs) — the whole household must not get locked out
  by this change.
- **Manual, both pilot phones, after deploying:** one parent creates a
  fresh email/password test account end-to-end (sign-up → verification
  email arrives → click it → "Ya verifiqué" → reaches onboarding); sign out
  and back in with that email/password; trigger and receive a password
  reset email.

## Out of scope

- Linking an email/password credential to an existing Google account (or
  vice versa) — a sign-up with an email that already has a Google account
  is blocked (criterion 7), not merged.
- Sign in with Apple — still tracked separately in `000`/`001`; unaffected
  by this spec either way (Apple's App Store Guideline 4.8 is triggered by
  offering third-party/social login, i.e. Google, not by also offering
  email/password).
- Multi-factor auth, passwordless (magic link) sign-in.
- Changing your password or email from within the app once signed in (only
  the signed-out "forgot password" reset flow is in scope).
- Rate-limiting/abuse protection beyond what Firebase Auth already does by
  default.

## Verification results (2026-09-16)

Implemented as designed. `AuthProvider` (Google) is untouched;
`EmailAuthProvider` lives alongside it in `src/auth/AuthProvider.ts` — a
sibling interface in the *same* file rather than its own, after discovering
mid-implementation that `EmailAuthProvider.ts` next to `emailAuthProvider.ts`
collides on a case-insensitive filesystem (macOS default) and silently
clobbers one file's content with the other's. Worth remembering for any
future same-name-different-case file pair in this repo.

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Sign-up creates the account, sends verification, lands on `VerifyEmailScreen` | ✅ unit (store, provider) + component (`EmailAuthScreen`) |
| 2 | Unverified account can't reach household data (client + rules) | ✅ `App.tsx` gate; rules — `firestore.rules — email verification gate` spot-checks 6 collections |
| 3 | "Ya verifiqué" → proceeds once actually verified | ✅ `refreshEmailVerified` unit tests; `VerifyEmailScreen` component test |
| 4 | Sign-in lands exactly where Google sign-in would | ✅ same `App.tsx` routing, no email-specific branch beyond the verification gate |
| 5 | Wrong password / unknown email → one generic message | ✅ `mapAuthError` collapses both to `wrongCredentials`; unit-tested |
| 6 | Forgot-password: same confirmation regardless of account existence | ✅ provider swallows `auth/user-not-found`; component test confirms identical UI either way |
| 7 | Sign-up on an email that already has an account → specific message | ✅ `emailInUse` kind, mapped and unit-tested |
| 8 | Google sign-in unaffected | ✅ full existing suite green; `googleAuthProvider` behavior unchanged (now also returns `emailVerified`, always `true` from Google) |
| 9 | Rules deny unverified read/write everywhere, verified unaffected | ✅ `firestore.rules — email verification gate (spec 014)` (6 collections) + a dedicated `storage.rules` case; full existing 62-test rules suite re-passed unchanged after updating every `authenticatedContext(uid)` call site to pass `{ email_verified: true }` |

**Automated:** `src/auth/__tests__/forms.test.ts` (validation), `mapAuthError.test.ts`
(every Firebase error code), `emailAuthProvider.test.ts` (native provider,
mocked SDK), `authStore.test.ts` (all 5 new actions), `EmailAuthScreen.test.tsx`,
`VerifyEmailScreen.test.tsx`, `WelcomeScreen.test.tsx` (mode switch). 44 unit
suites / 288 tests, `tsc --noEmit` clean. Rules: `emailVerification.rules.test.ts`
(new) + one added case in `receiptsStorage.rules.test.ts`; 9 rules suites / 69
tests, all green (up from 8/62 pre-spec).

**Not yet done — deliberately paused before going further, both outward-facing/hard-to-reverse:**
- **Enabling "Email/Password" sign-in in the Firebase console.** This is a
  one-time manual toggle (Authentication → Sign-in method), not something
  `firebase deploy` touches. Without it, `createUserWithEmailAndPassword`
  fails server-side even though the client code is correct. **Needs to be
  done before this feature works for real users.**
- **Deploying the updated `firestore.rules` / `storage.rules` to
  `da2-coparenting`.** The code and the emulator-tested rules are ready
  (`npx firebase deploy --only firestore:rules,storage --project
  da2-coparenting`), but this changes the access gate for the **live pilot
  household already using the app** — per the spec's own "Rollout care"
  note, holding off on an unsupervised deploy of this specific piece until
  there's a chance to confirm it, or the go-ahead to just ship it (Google's
  `email_verified: true` claim is well-established Firebase behavior, so
  the risk is believed low, not zero).
- The JS/OTA side of this (the new screens, `App.tsx` gate, `AuthUser.emailVerified`)
  is inert for every existing user until the rules deploy happens — it can
  ship via OTA safely on its own first.
- Manual, both pilot phones: not started (blocked on the two steps above).
