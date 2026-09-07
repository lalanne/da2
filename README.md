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
  with amount/category/date. Private by default; each receipt is explicitly
  shared with the co-parent when the uploader chooses.

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

In development. **Specs 001 (auth) and 002 (household linking) are verified**
end-to-end on both pilot phones (mother's Android, father's iPhone via
TestFlight) against the live Firebase project: Google Sign-In through a
provider-agnostic auth layer, one real household of 3 children linked by
single-use invite code, Spanish UI, security rules with adversarial-case
tests. Spec 007 (design system — a `src/theme` token module and
`src/components` primitives, WCAG AA) is verified on both phones. Spec 004
(custody calendar — recurring pattern with per-day changeover, propose/approve
for every change, computed client-side from a live query over proposals) is
verified on both phones. Spec 005 (kid events — a third "Eventos" tab, weekly
recurrence for training, dots on the calendar) is verified on both phones.
Working order:
001 → 002 → 007 → 004 → 005 → 003 → 008 (008 = OS push, deferred infra). Spec
006 (deployment pipeline) runs continuously — every verified feature is
deployed to the two-phone pilot; see
[specs/006-deployment-pilot.md](specs/006-deployment-pilot.md).
