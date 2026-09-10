# da2 — Co-Parenting App

An app for divorced or separated parents who share custody and expenses of
their children. It replaces scattered (and often tense) text messages with one
shared place for:

- **Custody calendar** — a color-coded calendar showing which parent has the
  kids each day, driven by a recurring pattern (alternating weeks,
  every-other-weekend, 2-2-3, …) with day-swap overrides. Any change must be
  proposed by one parent and approved by the other.
- **Kid events** — doctor appointments, birthdays, tournaments, training
  sessions — visible to both parents, overlaid on the custody calendar.
- **Receipts & invoices** — upload tuition invoices, medical receipts, etc.
  with amount/date and optional tags. Private by default; each receipt is
  explicitly shared with the co-parent when the uploader chooses.

## How it works

Each parent signs in with their own Google account. The first parent creates
a household and adds the kids; the second parent joins with a single-use
invite code. From then on, both see the same calendar, events, and shared
receipts in real time.

The app's interface is in **Spanish (Latin American neutral)**. v1 is
Spanish-only, with all copy routed through one strings module so other
languages can be added later.

## Platform & stack

| Layer | Choice |
|-------|--------|
| App | Expo (React Native) + TypeScript — pilot on Android + iOS (TestFlight); public launch Android first, then iOS and web, same codebase |
| Auth | Firebase Auth (Google Sign-In; Sign in with Apple before iOS launch) |
| Data | Cloud Firestore (real-time sync between parents) |
| Files | Firebase Storage (receipt images/PDFs) |
| Push | Firebase Cloud Messaging (proposal & event notifications) |
| Delivery | EAS Build / Submit |

Full rationale in [specs/000-overview.md](specs/000-overview.md).

## Development process

This project uses **Spec-Driven Development (SDD)**: every feature has a spec
in [`specs/`](specs/) with user stories, data model, and Given/When/Then
acceptance criteria. No code is written without an approved spec, and a
feature is done only when all its acceptance criteria pass.

See [specs/README.md](specs/README.md) for the spec index and process rules.

## Status

In development. **Specs 001 (auth), 002 (household linking), 007 (design
system), 004 (custody calendar) and 005 (kid events) are verified**
end-to-end on both pilot phones (mother's Android, father's iPhone via
TestFlight) against the live Firebase project — Google Sign-In, one real
household of 3 children linked by invite code, a shared custody calendar with
propose/approve, and kid events, all in a Spanish UI on a WCAG-AA design
system, with security rules covering the adversarial cases. Spec 003
(receipts & invoices — private-by-default with one-way sharing, Firebase
Storage + Storage security rules) is implemented and shipped to the pilot
(`expo.version` 1.1.0); the `1.2.0` build adds a multi-select tag filter and
the app icon, pending its pilot check. Working order:
001 → 002 → 007 → 004 → 005 → 003 → 008 (008 = OS push, deferred infra). Specs
006 (deployment pipeline) and 009 (implemented — calendar/list pickers that
replaced every free-text date & time field) are cross-cutting; 006 runs
continuously — every verified feature is deployed to the two-phone pilot; see
[specs/006-deployment-pilot.md](specs/006-deployment-pilot.md).
