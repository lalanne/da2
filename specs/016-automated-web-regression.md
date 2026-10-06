# 016 — Automated web regression suite

**Status:** approved
**Depends on:** 006 (deployment pipeline — this becomes one of its gates),
011 (web platform — the thing under test), 014 (email/password — the
sign-in path the suite drives, instead of Google OAuth)

## Purpose

The web app (011/012) is the current priority platform alongside iOS — see
[[pilot-status]] (2026-09-30 platform-priority shift; Android is on hold).
Up to now, every regression has been found by a human clicking through the
live site after deploy (the `auth/popup-blocked` sign-in break, found only
because the user tried it). Nothing runs automatically before a merge or a
deploy. This spec builds that: an automated suite that drives the real web
UI against a real (emulated) Firebase backend, covering the acceptance
criteria of the specs that apply to web, running in CI on every push/PR —
so a change that breaks an existing feature is caught before it reaches
`main`, let alone `da2-coparenting.web.app`.

This is deliberately **web-only** for now. Spec 001 planned a
Maestro-on-Android-emulator E2E layer for native; it was never built, and
building it is out of scope here — it would need its own spec, and native
(specifically Android/Javiera) isn't the current focus. If mobile E2E
becomes a priority again, that's a separate numbered spec that can reuse
this one's Firebase-emulator and test-account groundwork.

## Decisions

- **Playwright**, not Maestro/Cypress/Detox: drives a real browser (Chromium
  headless in CI), runs the same JS/CSS the user gets, supports multiple
  independent browser contexts in one test — needed for two-parent flows
  (one parent proposes, the other approves) without faking it.
- **Firebase Local Emulator Suite** (Auth + Firestore + Storage), not a
  staging Firebase project: fast, free, deterministic, and — same guarantee
  `firebase/tests/**` already has — **automated tests can never touch the
  real pilot household**, no matter what a test does wrong. Same `demo-da2`
  project id convention as the existing rules tests.
- **Email/password (014) for sign-in, not Google OAuth**: a real Google
  account picker can't be automated (this is also why 001's Maestro plan
  specified a fake-login substitute). 014 already gives the app a form
  Playwright can fill directly, with no substitute UI needed. Real Google
  sign-in stays a manual checklist item, as spec 001 already decided — this
  spec doesn't change that.
- **Test accounts are seeded directly against the Auth/Firestore emulators**
  via the Firebase Admin SDK (new devDependency, emulator-only — see
  Requirements), **not** by driving the sign-up + email-verification UI.
  Sign-up/verification already has its own coverage in 014; seeding lets
  every other spec's e2e test start from a known, pre-verified account and
  household in milliseconds instead of re-walking onboarding every time.
- **GitHub Actions**, run on every push and PR. There is no CI at all in
  this repo today — `.github/workflows/` doesn't exist, and every gate
  (`npm test`, `npm run typecheck`, `npm run test:rules`) is something a
  human (so far, me) remembers to run by hand. This spec's CI job runs all
  three of those too, not just the new e2e layer — today's manual gates
  become automatic as a side effect.
- **Behavioral, not visual.** This suite asserts on UI state (text, roles,
  testIDs) and on the resulting emulator data (Firestore documents, Storage
  objects) — not pixel/screenshot diffing. Visual regression is a different
  tool and a different spec, if ever wanted.

## Requirements

### Emulator-aware web build

- `src/data/firebaseWebApp.ts` gains an emulator-connect branch, gated by a
  new `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` env var: when `'true'`, call
  `connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator`
  against `127.0.0.1` on the ports already declared in `firebase.json`
  (auth 9099, firestore 8080, storage 9199), immediately after
  `initializeApp`. Every other `*.web.ts` file already goes through
  `webApp()`, so nothing else changes.
- Per the existing documented gotcha (`specs/011-web-platform.md`'s
  blank-page incident): the `process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR`
  reference must be written out literally at the call site, not through a
  helper that takes the var name dynamically — Expo's babel plugin can't
  inline a dynamic property access.
- Never set in the `preview`/production EAS environments or in the normal
  `npx expo export -p web` used for real deploys — only the e2e build step
  sets it. A unit test (`tokenDiscipline`-style, or a dedicated small test)
  asserts the emulator-connect branch is unreachable unless the flag is
  exactly `'true'`.
- `firebase.json` gains a `hosting` emulator port so
  `firebase emulators:exec` can serve the exported `dist` build alongside
  Auth/Firestore/Storage in one command — Playwright's `baseURL` points at
  it.

### Test data seeding

- A small seeding script/module (Node, Firebase Admin SDK, pointed at the
  emulator via `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST`)
  creates parent accounts directly: `emailVerified: true` already set (so
  `VerifyEmailScreen` / the rules' `email_verified` check never blocks a
  test), plus whatever household/calendar/event/receipt/split fixture data
  a given test file needs.
- Each e2e test file uses its own unique account emails and household invite
  code (random suffix) rather than one shared fixture — avoids cross-file
  interference without needing a slow full-emulator reset between files
  (the same reasoning `firebase/tests/**` applies with distinct household
  ids like `A`/`B`/`HID`, just generated instead of hardcoded, since e2e
  files may run concurrently).

### Harness

- New `e2e/` directory at the repo root (sibling to `src/`, `firebase/`) —
  Playwright config, specs, and the seeding helper. Kept separate from
  `src/**/__tests__` (component tests) and `firebase/tests/` (rules tests),
  matching this repo's existing pattern of one Jest project per test
  *kind*; e2e is a fourth kind, Playwright instead of Jest.
- New npm script: `test:e2e` — runs `expo export -p web` with the emulator
  flag set, then `firebase emulators:exec --only auth,firestore,storage,hosting --project demo-da2 "playwright test"`.
- New devDependencies: `@playwright/test`, `firebase-admin`. No change to
  any app dependency — the emulator-connect branch uses the `firebase` web
  SDK already present (011).

### CI

- New `.github/workflows/ci.yml`, triggered on `push` and `pull_request`.
  Four jobs, in a **strict sequential pipeline** (`needs:`), cheapest/fastest
  first, each gating the next — no point booting a browser and the Firebase
  emulators for e2e if the code doesn't even typecheck:
  1. **static-analysis** (`npm run typecheck`) — no linter exists in this
     repo yet, so this is typecheck alone for now; a future `npm run lint`
     slots in here unchanged.
  2. **unit** (`npm test`) — needs static-analysis.
  3. **integration** (`npm run test:rules`, Firestore/Storage rules against
     the real emulator) — needs unit.
  4. **e2e** (`npm run test:e2e`, acceptance-level — the real UI driven
     against the real emulators) — needs integration.
  The integration and e2e jobs need Java (a `firebase-tools` emulator
  requirement) via `actions/setup-java`.
- This spec does **not** turn on branch-protection "required checks" in the
  GitHub repo settings — that's a repo-admin action with its own blast
  radius (it changes who can merge what), left for the user to flip on
  once the suite has run green for a while and they're ready to make it a
  hard gate rather than an informational one.

### Code coverage reporting (planned, not yet built — 2026-10-06)

The user asked for this as a "next time" follow-up, not part of the current
CI PR. Not to be confused with the "Coverage" section below, which tracks
which *specs/flows* the e2e suite exercises — this is code coverage
*percentage*, surfaced on the **unit** job (`npm test`, which already runs
on `jest`/`jest-expo`, Istanbul-based coverage built in via `--coverage`,
no new dependency). Sketch, to firm up when this is actually picked up:
- `npm test -- --coverage` in the unit job; write the summary to
  `$GITHUB_STEP_SUMMARY` so it shows directly on the job's Actions page —
  no new third-party service (Codecov etc.) unless a stronger reason shows
  up later for wanting historical trend tracking across runs.
- Whether `test:rules` (the integration job) also gets a coverage report is
  an open question — Firestore/Storage rules coverage is a different shape
  (rule-path hits, not line coverage) and may want its own approach rather
  than reusing Istanbul's.
- Decide then whether this becomes a hard gate (fail under some %) or
  purely informational, same open-question shape as the branch-protection
  decision above.

### Coverage — built incrementally, one spec per follow-up change

This spec's own acceptance criteria (below) cover only the harness itself —
proving the pipeline works end-to-end on one real flow. Each later addition
is its own test-first change (same TDD discipline as everything else),
driving the UI for a spec that's already `implemented`/`verified`, in this
order:

1. **001 + 014** (this spec) — sign in with email/password, reach the main
   screen, sign out.
2. **002** — household create, invite code join as a second browser context
   (second parent).
3. **004** — custody propose (parent A) → approve (parent B), two browser
   contexts, asserting the calendar updates for both.
4. **005** — create/edit a kid event, visible to both parents.
5. **003** — upload a receipt, confirm it's visible and tagged correctly.
6. **010** — propose a split, approve, record a settlement, confirm the
   balance.
7. **015** — solo-parent self-approval before a second parent has joined.
8. **012** — the wide-web layout: sidebar nav + master-detail list behavior
   at a wide viewport.

Specs 007/009 (design system, date/time input) are exercised incidentally by
the above rather than getting dedicated e2e tests — they're already fully
unit-tested (`src/theme/__tests__`, `DateField`/`TimeField` component
tests) and are presentation/input concerns, not full-flow ones.

## Non-goals

- Native (Android/iOS) E2E — stays "planned, not built" per spec 001; a
  separate spec if ever prioritized again.
- Automating real Google OAuth sign-in — stays a manual checklist item.
- Visual/pixel regression testing.
- Turning on GitHub branch-protection required-checks (see CI, above) — a
  deliberate follow-up decision, not part of this spec.
- Replacing spec 006's manual pilot-phone verification pass — that remains
  the final gate for native; this spec is web's equivalent gate.

## Acceptance criteria

1. **Given** a push or PR to this repo, **when** CI runs, **then** unit
   tests, typecheck, rules tests, and the e2e suite all run automatically
   with no manual step, and the PR shows pass/fail for each.
2. **Given** the e2e suite runs anywhere (CI or a developer's machine),
   **then** it only ever talks to the local Firebase emulator suite (project
   id `demo-da2`) — never `da2-coparenting` — verified the same way the
   rules tests already guarantee this (emulator-only test configuration;
   no production credentials available to the e2e job).
3. **Given** a seeded, pre-verified test account, **when** the harness's
   smoke test runs, **then** it signs in via the email/password form, reaches
   the main screen, and signs out — without ever exercising the Google
   popup path.
4. **Given** the smoke test is green, **when** a developer deliberately
   breaks something the test actually exercises (done once locally as
   proof, then reverted — never left in place), **then** the e2e job fails
   red, demonstrating the suite catches a real regression and not just its
   own happy path. Note: this can only prove the suite catches bugs in the
   path it automates (email/password + Firestore/Storage wiring) — the
   `auth/popup-blocked` bug specifically lived in the Google OAuth path,
   which is structurally outside this suite's reach (see Non-goals); that
   bug class stays a manual-checklist risk forever, same as spec 001
   already decided for Google sign-in generally.
5. **Given** a later spec's flow is added to the suite (see Coverage),
   **then** it drives the real UI (not repository functions called
   directly) and asserts both the UI's resulting state and the emulator's
   Firestore/Storage data — catching rendering bugs and wiring bugs alike,
   the two kinds of bug that separately broke production once each.

## Progress

**2026-10-01 — harness built, criteria 1–4 proven locally.** `firebaseWebApp.ts`
gained the emulator-connect branch (unit-tested); `firebase.json` gained a
hosting emulator port; `e2e/` holds the Playwright config, an Admin-SDK
`globalSetup` that seeds a pre-verified parent + one-parent household, and
the smoke test itself; `.github/workflows/ci.yml` adds unit/typecheck,
rules, and e2e as three CI jobs. `npm run test:e2e` passes locally. Found
along the way, both now reflected above: (1) `expo export` force-overrides
`NODE_ENV` to `production` and ignores an invoking shell's `NODE_ENV=test`,
so the e2e build sources `.env.test` into the shell directly instead of
relying on Expo's own mode-file loading (`@expo/env` never overrides an
already-set process env var, so this can't leak into a real deploy, which
never sources that file). (2) Playwright's default desktop viewport
triggers spec 012's wide-web `WebShell` layout, not the phone-width
`TabBar` — the smoke test asserts on `web-nav-*` testIDs accordingly; a
narrow-viewport variant is part of Coverage item 8 (012), not this one.
Criterion 4 proven using an argument-order swap in
`emailAuthProvider.web.ts`'s `signInWithEmailAndPassword` call (reverted
immediately after confirming red).

**2026-10-01 — CI confirmed, verified.** First real CI run (on the harness
PR, same commit landing on `main`) caught a real pre-existing bug on its
very first try: `calendarTab.wideWeb`/`eventsTab.wideWeb` fixed a kid event
to a hardcoded `date: '2026-09-20'`, which `upcomingOccurrences()` correctly
dropped once real time passed it — nothing to do with this harness, fixed
separately (PR #14, relative dates via `addDays(todayInTimezone(...), 2)`).
With that merged in, all three jobs (unit/typecheck, rules, e2e) passed in
GitHub Actions: <https://github.com/lalanne/da2/actions/runs/36807294160>.
Criteria 1–4 verified. Coverage items 2–8 remain open follow-ups.

## Verification plan

- Build the harness against criterion 1–3 first (the smoke test), confirm
  it runs locally (`npm run test:e2e`) and in a CI run on a draft PR.
- Prove criterion 4 once, by hand, during that same PR: swap the argument
  order in `emailAuthProvider.web.ts`'s `signInWithEmailAndPassword(auth(),
  email, password)` call — a real call-shape bug, the same class as
  `auth/popup-blocked`, just in the path this suite actually drives — watch
  the e2e job go red, then revert and confirm green again. Documented in
  the PR description, not left in the codebase.
- Each Coverage item (2 onward) ships as its own PR: the new e2e test is
  written first and fails against current `main` only if a real gap exists
  (most of these flows already work — the test proves the *harness* exercises
  them, and stands as a regression guard from then on), then is confirmed
  green.
- Spec marked `verified` once the smoke test (criteria 1–4) is green in CI
  on `main`; each Coverage item's completion is tracked here as it lands,
  same as other cross-cutting specs (006, 007, 009).
