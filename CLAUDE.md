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
`core-practices--v0.3.0`): skills `spec-first`, `tdd-change`, `open-pr`, plus
a branch-guard hook that blocks commits/pushes to `main` regardless of what
the skills decide. Those skills carry the generic discipline; the sections
below are what's specific to da2 on top of them.

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

Read `specs/000-overview.md` first — it holds the product vision, v1
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
   verified as a full user flow. There is no Maestro/e2e harness in this
   repo yet (planned in spec 001, never built) — if a change genuinely
   needs that layer to be trustworthy, that infrastructure is part of the
   change, not something to skip past.
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

## Test layout

- `src/**/__tests__/` — unit and component tests (mocked Firebase/Google
  modules), run by the default `jest.config.js`.
- `firebase/tests/` — Firestore/Storage security rules tests, run by
  `jest.rules.config.js` against the local emulator, never against a real
  project. Kept in a separate Jest project (different `testEnvironment` and
  `tsconfig`) because they use the `firebase` web SDK against the emulator,
  not the React Native app code.
- `__mocks__/@react-native-firebase/*`, `__mocks__/@react-native-google-signin/*`
  — root-level manual mocks Jest auto-applies to any test importing these
  native packages, since their real native modules don't exist under Jest.
  Override per-test with `jest.mock(...)` when a test needs specific
  request/response behavior (see `googleAuthProvider.test.ts`).

## Locked-in stack decisions (rationale in specs/000-overview.md)

- **Expo (React Native) + TypeScript** — Android first; iOS and web later from
  the same codebase. Delivery via EAS Build/Submit.
- **Firebase**: Auth (Google Sign-In), Firestore (real-time sync), Storage
  (receipt files), Cloud Messaging (notifications). No custom API server.
- Auth must stay behind a provider-agnostic wrapper — Sign in with Apple is
  required before iOS launch (App Store Guideline 4.8).
- Security is enforced in Firestore/Storage **rules**, not just UI — several
  acceptance criteria explicitly test rules (co-parents may be adversarial;
  e.g. a proposer must not be able to approve their own custody proposal).

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
