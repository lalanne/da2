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
| 003 | [Receipts & invoices](003-receipts.md) | implemented |
| 004 | [Custody calendar](004-custody-calendar.md) | verified |
| 005 | [Kid events](005-events.md) | verified |
| 006 | [Pilot deployment pipeline](006-deployment-pilot.md) | draft |
| 007 | [Design system & visual language](007-design-system.md) | verified |
| 008 | [Push notifications](008-push-notifications.md) | draft |
| 009 | [Date & time input](009-date-time-input.md) | implemented |
| 010 | [Shared expense splitting](010-expense-splitting.md) | implemented |
| 011 | [Web platform](011-web-platform.md) | draft |
| 012 | Responsive web layout (not yet drafted — follows 011) | — |

Status values: `draft` → `approved` → `implemented` → `verified`.

## Build order

The number is *mostly* the build order, with two deliberate exceptions:

- **006 (deployment pipeline) is continuous** — it's exercised alongside every
  other spec, not built once and left.
- **007 (design system) is built before the feature specs** — 003–005 compose
  their UI from its primitives. It's numbered 007 only to avoid renumbering
  specs that are already referenced widely.
- **The custody calendar (004) and kid events (005) come before receipts
  (003)** — they're the product's core and the pilot's priority; 003 doesn't
  depend on them.
- **008 (push notifications) is deferred infrastructure** — 004 and 005 ship
  with an in-app "pendiente" banner instead, and 008 (Cloud Functions + APNs +
  a native build) follows once the features are proven.
- **009 (date & time input) is cross-cutting** like 007 — it swaps the
  free-text date/time fields in 002–005 for calendar/list pickers. Pure JS,
  OTA; no data or rules change.
- **010 (expense splitting)** builds on 003 (receipts) and reuses 004's
  propose/approve machinery. It pulls "splitting math / balances /
  settlement" from `000`'s v1 *out* column into scope.
- **011 (web platform) + 012 (responsive web layout)** move web ahead of the
  public launch (`000`'s original order was Android → iOS → web), at the
  pilot's request, with full feature parity as the goal. 011 is
  infrastructure only — the same mobile UI running in a browser via the
  `firebase` web SDK, no rules or data changes. 012 (not yet drafted) is the
  desktop redesign layered on top once 011 is verified.

So the working order is: **001 → 002 → 007 → 004 → 005 → 003 → 008**, with 006
running throughout and 011/012 following once the mobile pilot's core specs
are settled.
