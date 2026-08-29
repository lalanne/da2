# 000 — Product Overview & Stack

**Status:** draft

## Vision

An app for divorced/separated parents who share custody and expenses of their
children. It centralizes what today happens over hostile text messages: who has
the kids when, what events the kids have (doctor appointments, birthdays,
tournaments, training sessions), and the paper trail of shared expenses
(receipts, tuition invoices).

## Target users

Two co-parents per household. Each parent has their own account; they are
linked into one shared household via invite code.

## Platform strategy

- **v1: Android** (Google Play).
- **Later: iOS and web** from the same codebase.
- Framework: **Expo (React Native) + TypeScript** — one codebase for all three
  targets; EAS Build/Submit for store delivery.

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

Trade-off accepted: Firestore is weaker at relational/reporting queries than
Postgres. Revisit only if expense reporting outgrows it.

## v1 scope

| In | Out (later) |
|----|-------------|
| Google Sign-In (per parent) | Sign in with Apple (required at iOS launch) |
| Household via invite code, one household per parent | Multiple households per parent |
| Receipt/invoice upload with amount, category, date; per-receipt sharing | Expense-splitting math, balances, settlement |
| Custody calendar: recurring pattern + day overrides, propose/approve flow | In-app messaging |
| Kid events (appointments, birthdays, tournaments, training) | External calendar sync (Google/Apple Calendar) |
| Push notifications for proposals | OCR of receipts |

## Cross-cutting constraints

- **Trust model:** co-parents may be adversarial. Schedule changes are never
  unilateral — propose/approve is the default for anything that affects both
  parents.
- **Auth abstraction:** built provider-agnostic so Sign in with Apple can be
  added without rework (App Store Guideline 4.8 requires it once Google
  Sign-In is offered on iOS).
- **Privacy:** receipts are private to the uploader until explicitly shared.
