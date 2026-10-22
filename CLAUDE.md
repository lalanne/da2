# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A co-parenting app for divorced/separated parents sharing custody and expenses:
custody calendar with propose/approve changes, kid events, and receipt/invoice
sharing. Two parents per household, linked by invite code, each signing in with
their own Google account.

## Shared engineering practices

This repo is wired to the private `eng-standards` marketplace's
`core-practices` plugin (`.claude/settings.json`, pinned to
`core-practices--v0.4.0`): skills `spec-first`, `tdd-change`, `open-pr`, the
`coder` agent, plus a branch-guard hook that blocks commits/pushes to `main`
regardless of what the skills decide. Those skills carry the generic
discipline; the sections below are what's specific to da2 on top of them.

Once a spec is approved, delegate the implementation and PR to the
`core-practices:coder` agent instead of implementing it in the main session.

## Spec-Driven Development — the core rule

No feature code without an approved spec, specs are the source of truth —
edit the spec first when requirements change. Generic discipline enforced by
the `spec-first` skill; da2-specific process, defined in `specs/README.md`:

1. Every feature has a numbered spec in `specs/` (user stories, requirements,
   data model, Given/When/Then acceptance criteria).
2. A feature is done only when all its acceptance criteria pass; specs move
   `draft → approved → implemented → verified`, tracked in the index table in
   `specs/README.md` (keep it updated).
3. Implement one spec at a time, in numbered order (they declare dependencies).

Read `CONSTITUTION.md` first — it holds the product vision, v1
scope/out-of-scope table, and cross-cutting constraints.

## Test-Driven Development — how every change is made

Every change — feature, bug fix, or cosmetic fix — is test-first with a
regression test. Generic discipline enforced by the `tdd-change` skill;
what's specific to da2:

1. This isn't only about unit tests. Reach for whichever layer actually
   exercises the change: `firebase/tests/**` (Firestore/Storage rules —
   the emulator, never a real project) for anything security-rule-shaped;
   a mocked-SDK test asserting the *exact* call shape (arguments, not just
   "was called") when the bug lives in how a third-party SDK is invoked —
   two real production auth bugs lived exactly there, each fixed once on
   native and only later discovered to have zero test coverage on the web
   twin, exactly how a fix quietly stops holding on the platform nobody's
   watching; an end-to-end / acceptance test when the change is best
   verified as a full user flow. Web e2e exists — a Playwright suite in
   `e2e/` driving the real web build against the emulators (spec 016,
   `npm run test:e2e`); reach for it when a change is only trustworthy as
   a full flow. Native (Android/iOS) e2e does not exist — a 016 non-goal,
   and whether to build it at all is an open decision (issue #56, proposed
   as spec 017; spec 001's old Maestro plan is no longer standing). So a
   native-only flow has no harness yet — if a change genuinely needs that
   layer to be trustworthy, that infrastructure is part of the change, not
   something to skip past.
2. When you can *prove* a regression test would have caught the bug (e.g.
   by temporarily reverting the fix locally and watching it fail), that's
   worth doing and saying so — it's the difference between a real
   regression test and a tautological one. Never leave the revert in
   place; it's a local sanity check, not part of the change.

## Commands

- `npm start` / `npm run android` / `npm run ios` — Expo dev server. Note:
  the app imports `@react-native-firebase/*` and
  `@react-native-google-signin/google-signin`, which are native modules —
  it cannot run in Expo Go; a custom dev client (`eas build --profile
  development`) is required once those are wired up end-to-end.
- `npm run typecheck` — `tsc --noEmit` over app source (test files are
  excluded from this check; see below).
- `npm test` — Jest unit/component tests (`jest-expo` preset). Run a single
  file: `npm test -- src/store/__tests__/authStore.test.ts`.
- `npm run test:rules` — Firestore security rules tests. Spins up the
  Firebase emulator (`firebase emulators:exec`) against a `demo-da2` project
  id and runs `firebase/tests/**` with `jest.rules.config.js`. No login or
  real Firebase project needed — emulator-only, `demo-`-prefixed project ids
  never touch real infrastructure.
- `npm run test:e2e` — Playwright end-to-end suite against the real web
  build, **both** browser projects. Exports the web bundle with `.env.test`
  (emulator-pointed config) via `npm run test:e2e:build`, then runs
  `e2e/playwright.config.ts` inside `firebase emulators:exec` (auth,
  firestore, storage, hosting) on `demo-da2`. Same emulator-only guarantee
  as `test:rules`. `npm run test:e2e:chromium` / `test:e2e:webkit` run just
  one engine (same wrapper, `--project=chromium`/`webkit` appended) — what
  CI's two parallel e2e jobs actually run. Run a single file by wrapping it
  the same way (the config's `globalSetup` seeds via the `*_EMULATOR_HOST`
  vars that `emulators:exec` sets, and `baseURL` is the hosting emulator
  serving `dist/`, so neither works outside that wrapper — and
  `test:e2e:build` must have run at least once):
  `npx firebase emulators:exec --only auth,firestore,storage,hosting
  --project demo-da2 "npx playwright test --config e2e/playwright.config.ts
  e2e/tests/split.spec.ts"` (`npx` matters outside the npm scripts —
  neither binary is on `PATH` on its own). The config is `fullyParallel`
  with 9 specs (11 test executions — 2 of them, `smoke` and
  `googleSignIn`, also run under a `webkit` project, issue #54), which on a
  loaded dev machine starves them into `toHaveCount`/visibility timeouts
  (observed: `receipts`, `custody`, `events` failing at ~20s each, each
  passing alone in ~3s, and the whole suite green under `--workers=1`).
  Re-check a red full-suite run with `--workers=1` before treating it as a
  real regression; CI masks this with `retries: 1`. (Issue #51 tracks
  fixing this properly rather than living with the workaround.)

## Test layout

- `src/**/__tests__/` — unit and component tests (mocked Firebase/Google
  modules), run by the default `jest.config.js`.
- `firebase/tests/` — Firestore/Storage security rules tests, run by
  `jest.rules.config.js` against the local emulator, never against a real
  project. Kept in a separate Jest project (different `testEnvironment` and
  `tsconfig`) because they use the `firebase` web SDK against the emulator,
  not the React Native app code.
- `e2e/` — Playwright web end-to-end suite (spec 016), run by
  `npm run test:e2e`, never by Jest. `e2e/tests/*.spec.ts` is one file per
  spec-level flow (smoke → 001+014, household → 002, custody → 004,
  events → 005, receipts → 003, split → 010, solo → 015, wideWeb → 012,
  googleSignIn → 001+011); `e2e/support/globalSetup.ts` seeds accounts and
  households straight into the emulator; `e2e/fixtures/` holds upload
  fixtures. Multi-parent flows use a second browser context as the
  co-parent. Note two files must not share a seeded account if both create
  receipts — they collide under `fullyParallel`.
- `googleSignIn.spec.ts` drives the Firebase Auth emulator's own fake IDP
  popup widget (not app code — a Firebase-owned page with its own DOM;
  `#add-account-button` / `#email-input` / `#sign-in`, found by inspecting
  the emulator directly), confirmed by temporarily reintroducing the real
  `auth/popup-blocked` bug and watching it still pass under Chromium — it
  only reproduces on Safari/some Chromium configs, not headless Chromium's
  defaults. That's why it (and `smoke.spec.ts`) also run under a `webkit`
  project (issue #54) — the closest proxy this suite has for Safari, and
  for the pilot's iOS platform, until native e2e exists (#56). The other
  specs stay Chromium-only: engine-specific breakage here has only ever
  been popup/gesture/storage territory, not Firestore listeners, and
  doubling every spec risks #51's worker-starvation problem instead of
  waiting on it.
- `__mocks__/@react-native-firebase/*`, `__mocks__/@react-native-google-signin/*`
  — root-level manual mocks Jest auto-applies to any test importing these
  native packages, since their real native modules don't exist under Jest.
  Override per-test with `jest.mock(...)` when a test needs specific
  request/response behavior (see `googleAuthProvider.test.ts`).

## Non-negotiables (full detail in CONSTITUTION.md)

`CONSTITUTION.md` is the single source for stack, platforms, scope and
constraints — don't restate it here. The rules most easily broken by a code
change:

- Security is enforced in Firestore/Storage **rules**, not just UI — co-parents
  may be adversarial; e.g. a proposer must not be able to approve their own
  custody proposal (the one-parent household of spec 015 is the only
  exception).
- Auth stays behind the provider-agnostic wrappers — Sign in with Apple is
  required before iOS App Store launch (Guideline 4.8).
- All user-facing copy goes through `src/i18n/`; all styling through
  `src/theme/` tokens and `src/components/` primitives.

## Reference project

`/Users/lalanne/github/chilaminas_android` is an existing Expo + Firebase app
by the same author (Expo 57, React Native Firebase, React Navigation, Zustand,
MMKV). Use it as a working reference for Expo/Firebase wiring and version
choices. Per its AGENTS.md: Expo has changed significantly — consult the
versioned docs at https://docs.expo.dev/versions/ before writing Expo code.

## README maintenance rule

Whenever a change alters something the README states — scope, stack,
platform strategy, process, project status — update `README.md` in the same
commit. If it's unclear whether the README should change, ask the user
instead of guessing.

## Git

- Push via the `github-lalanne` SSH alias (already set as `origin`:
  `git@github-lalanne:lalanne/da2.git`). Plain `github.com` authenticates as
  the author's work account (`clalanne-enghouse`), which has no access to this
  repo — do not "fix" the remote back to `github.com`.
- Never commit directly to `main` — branch + PR (`gh pr create`) for every
  change. Generic discipline enforced by the `open-pr` skill and the
  branch-guard hook. Don't merge the PR yourself unless explicitly told to.
