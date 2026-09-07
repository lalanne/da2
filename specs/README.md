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
| 002 | [Household linking (invite code)](002-household.md) | verified |
| 003 | [Receipts & invoices](003-receipts.md) | draft |
| 004 | [Custody calendar](004-custody-calendar.md) | draft |
| 005 | [Kid events](005-events.md) | draft |
| 006 | [Pilot deployment pipeline](006-deployment-pilot.md) | draft |
| 007 | [Design system & visual language](007-design-system.md) | verified |

Status values: `draft` → `approved` → `implemented` → `verified`.

## Build order

The number is *mostly* the build order, with two deliberate exceptions:

- **006 (deployment pipeline) is continuous** — it's exercised alongside every
  other spec, not built once and left.
- **007 (design system) is built before 003** — specs 003–005 compose their UI
  from its primitives. It's numbered 007 only to avoid renumbering specs that
  are already referenced widely.

So the working order is: **001 → 002 → 007 → 003 → 004 → 005**, with 006
running throughout.
