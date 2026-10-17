# da2 Constitution — Product, Scope & Stack

**Version:** 1.2.0 · **Ratified:** 2026-10-17 · **Last amended:** 2026-10-17

The ground truth every spec in [`specs/`](specs/) must agree with. Not a spec
itself: no acceptance criteria, no `draft → verified` lifecycle. It changes
only by amendment — see [Governance](#governance).

## Vision

An app for divorced/separated parents who share custody and expenses of their
children. It centralizes what today happens over hostile text messages: who has
the kids when, what events the kids have (doctor appointments, birthdays,
tournaments, training sessions), and the paper trail of shared expenses
(receipts, tuition invoices).

## Target users

Co-parents of one household. Each parent has their own account; the second
parent joins the household via invite code. A household may have a single
parent for as long as the co-parent hasn't joined — the app must be fully
usable that way (spec 015).

## Platform strategy

- **Priority order: iOS → web → Android (pending).** iOS ships via
  TestFlight (spec 006). Web is live at
  [da2-coparenting.web.app](https://da2-coparenting.web.app) (specs 011 +
  012, full feature parity, desktop layout). Android builds from the same
  codebase but is paused as a pilot target since 2026-09-30; it has no
  launch slot until it's picked back up.
- This order governs both the pilot and the public launch. It replaces the
  original plan (Android on Google Play first, then iOS, then web).
- Framework: **Expo (React Native) + TypeScript**, one codebase for all three
  platforms; EAS Build/Submit/Update for native delivery, Firebase Hosting
  for web.

## Backend stack (decision)

**Firebase** (Auth + Firestore + Storage + Cloud Messaging).

Rationale:
- Google Sign-In is a hard requirement → Firebase Auth supports it natively.
- Custody calendar and proposals need real-time sync between two devices →
  Firestore listeners give this for free.
- Receipts need file storage → Firebase Storage.
- Proposals need push notifications → Firebase Cloud Messaging.
- Team already has a working Expo + Firebase reference project
  (`chilaminas_android`), reducing setup risk and time-to-deploy.
- No custom API server to build or operate → fastest path to deploy.
  (Spec 008 proposes amending this with Cloud Functions as the push sender;
  that amendment lands here when 008 is approved.)

Trade-off accepted: Firestore is weaker at relational/reporting queries than
Postgres. Revisit only if expense reporting outgrows it.

## v1 scope

| In | Out (later) |
|----|-------------|
| Sign-in per parent: Google (spec 001) and email/password (spec 014) | Sign in with Apple (required at iOS App Store launch) |
| Household via invite code, one household per parent | Multiple households per parent |
| Receipt/invoice upload with amount, tags, date; per-receipt sharing | OCR of receipts (spec 013, v2) |
| Expense splitting: % table (default + per-tag) agreed propose/approve, running balance, recorded payments (spec 010) | Caps / exclusions / pre-approval thresholds in the split |
| Custody calendar: recurring pattern + day overrides, propose/approve flow | In-app messaging |
| Kid events (appointments, birthdays, tournaments, training) | External calendar sync (Google/Apple Calendar) |
| Push notifications for proposals — **deferred** to spec 008; until then an in-app "pendiente" banner | Statement / PDF export of the expense ledger |
| Full use without a participating co-parent — calendar and expenses self-approve solo, a review queue (not silent inheritance) once one joins (spec 015) | An in-app dispute mechanism for historical records; removing a parent from a household |

## Cross-cutting constraints

- **Trust model:** co-parents may be adversarial. Schedule changes are never
  unilateral — propose/approve is the default for anything that affects both
  parents. The only exception is a one-parent household (spec 015), whose
  safety rests on `parentIds` being append-only.
- **Security lives in rules:** every trust guarantee is enforced by
  Firestore/Storage security rules and tested against the emulator — the UI
  is never the only guard.
- **Auth abstraction:** sign-in methods sit behind provider-agnostic
  wrappers (`AuthProvider` for Google/Apple, `EmailAuthProvider` alongside
  it) so Sign in with Apple can be added without rework (App Store Guideline
  4.8 requires it once Google Sign-In is offered on iOS).
- **Privacy:** receipts are private to the uploader until explicitly shared.
- **Language:** the UI is **Spanish (Latin American neutral)** — `tú` form,
  no Spain-only vocabulary (`celular` not `móvil`, `ustedes` not `vosotros`).
  v1 is Spanish-only: all user-facing copy goes through one strings module
  (`src/i18n/`), no language picker and no i18n library yet, so English or
  other locales can be added later without reworking call sites. System
  strings that surface to users (dates, errors) are localized too.
- **Visual system:** every screen is built from the shared design-system
  primitives and tokens defined in spec 007 (`src/theme/`, `src/components/`) —
  no raw colours, spacing, or type values in screen code. Tone is calm and
  neutral (neutral ground for two co-parents).
- **Regression gate:** the web e2e suite (spec 016) runs every shipped
  spec's flow against the emulators; a change that breaks it doesn't ship.

## Governance

- Specs, code and the README must agree with this document. When they
  conflict, this document wins until it is amended.
- A spec that changes v1 scope, platform strategy, the stack, or a
  cross-cutting constraint amends this document **in the same PR**.
- Every amendment bumps the version (major: a principle or constraint is
  removed or reversed; minor: something is added or materially changed;
  patch: wording) and adds a line to the log below.

## Amendment log

| Version | Date | Change |
|---------|------|--------|
| 1.2.0 | 2026-10-17 | Platform order set: iOS → web → Android (pending), for pilot and public launch. Spec 006 amended to match (iPhone + web are the pilot's verification surfaces; Android paused). |
| 1.1.0 | 2026-10-17 | Moved out of `specs/` (was `000-overview.md`, status `draft`) and ratified. Synced with shipped specs: email/password sign-in (014), web + iOS as current focus with Android paused, single-parent households (015), push marked deferred to 008, security-in-rules and e2e regression gate added as constraints. |
| 1.0.0 | — | Pre-ratification history as `specs/000-overview.md`, amended informally by specs 006, 007, 010, 011/012, 013 and 015 (see git history). |
