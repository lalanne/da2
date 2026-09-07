# 008 — Push Notifications

**Status:** draft
**Depends on:** 004 (custody proposals), 005 (events) — the events that need
pushing

## Why this is its own spec

Specs 004 and 005 both want to notify the other parent (a custody proposal, a
new event). Doing it properly is an infrastructure workstream that neither
feature spec should carry:

- `expo-notifications` — a native module, so this needs a **new pilot build**
  (not an OTA update).
- iOS needs an **APNs authentication key** wired into EAS.
- A **sender**: a client can't reliably push to the other device, so this
  needs a **Firebase Cloud Function** triggered on Firestore writes that
  calls the Expo Push API. This amends spec 000's "no custom API server" —
  Cloud Functions are serverless (nothing to operate) but are a new
  deployable surface.

Until this ships, 004 and 005 rely on the real-time listener + an in-app
"pendiente" banner.

## Scope (draft — refine before approval)

- Register each device's Expo push token on sign-in; store on
  `users/{uid}/pushTokens/{tokenId}` (a device can have several).
- Cloud Function `onProposalWrite` — on a `proposals` doc create/resolve,
  push to the *other* parent: "Nueva propuesta de cambio",
  "Se aprobó tu propuesta", "Se rechazó tu propuesta".
- Cloud Function `onEventWrite` — on an `events` doc create/update/delete,
  push to the other parent with what changed (delete notification names the
  deleted event).
- Tapping a notification deep-links to the calendar / the affected day.
- User setting: notifications on/off (per category later).
- Never send a parent a push for their own action.

## Open questions

- Expo Push API vs. FCM/APNs directly from the function.
- Cloud Functions deployment in the pilot pipeline (spec 006) — region,
  secrets, local emulation for tests.
- Quiet hours / batching for rapid edits.

## Out of scope

- Rich/interactive notifications (approve-from-notification).
- Email or SMS fallback.
