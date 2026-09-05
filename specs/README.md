# Specs — Spec-Driven Development

This project is built spec-first. Rules:

1. **No code without an approved spec.** Every feature has a spec file here, numbered in build order.
2. **Specs are the source of truth.** If requirements change, the spec is edited first, then the code.
3. **Acceptance criteria are the definition of done.** A feature ships only when every criterion in its spec passes.
4. **One spec at a time.** Implement, verify against criteria, then move to the next.

## Spec index

| # | Spec | Status |
|---|------|--------|
| 000 | [Product overview & stack](000-overview.md) | draft |
| 001 | [Authentication (Google Sign-In)](001-auth.md) | verified |
| 002 | [Household linking (invite code)](002-household.md) | approved |
| 003 | [Receipts & invoices](003-receipts.md) | draft |
| 004 | [Custody calendar](004-custody-calendar.md) | draft |
| 005 | [Kid events](005-events.md) | draft |
| 006 | [Pilot deployment pipeline](006-deployment-pilot.md) | draft |

Status values: `draft` → `approved` → `implemented` → `verified`.
