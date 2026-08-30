# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A co-parenting app for divorced/separated parents sharing custody and expenses:
custody calendar with propose/approve changes, kid events, and receipt/invoice
sharing. Two parents per household, linked by invite code, each signing in with
their own Google account.

## Spec-Driven Development — the core rule

This repo follows SDD strictly. **Do not write feature code without an approved
spec.** The process, defined in `specs/README.md`:

1. Every feature has a numbered spec in `specs/` (user stories, requirements,
   data model, Given/When/Then acceptance criteria).
2. Specs are the source of truth — when requirements change, edit the spec
   first, then the code.
3. A feature is done only when all its acceptance criteria pass; specs move
   `draft → approved → implemented → verified`, tracked in the index table in
   `specs/README.md` (keep it updated).
4. Implement one spec at a time, in numbered order (they declare dependencies).

Read `specs/000-overview.md` first — it holds the product vision, v1
scope/out-of-scope table, and cross-cutting constraints.

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
- Work happens directly on `main`.
