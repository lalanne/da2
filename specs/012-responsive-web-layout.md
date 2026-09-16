# 012 — Responsive web layout

**Status:** implemented
**Depends on:** 011 (the web platform this styles). **Touches:** `Screen`,
`MainScreen`, and the 4 tab screens' view-state machines (no data, store, or
repository changes).

Direction chosen from the canvas (2026-09-16): **"C — Panel"** — a persistent
sidebar, the calendar gets a side rail, and receipts/events become
list + detail side by side instead of one view replacing another.

## Problem

Spec 011 ships the exact mobile layout, unscaled, in a browser — correct as
a first cut, but on a real desktop window everything (the calendar cells
above all) renders **huge**: `MonthGrid`'s day cells are `flex: 1` columns
with no outer width cap, so a 1280px-wide window gives each of 7 columns
~180px.

## User stories

- As a parent on a desktop browser, the app uses the window sensibly — text
  and calendar days sized for reading, not stretched to fill the screen.
- As a parent on a wide window, I navigate via a sidebar instead of a bottom
  tab bar, and see the calendar's proposed changes / upcoming events /
  balance at a glance next to the month grid.
- As a parent browsing receipts or events on a wide window, I see the list
  and the selected item's detail side by side, not one replacing the other.
- As a parent on a phone's browser (or a narrow window), nothing changes —
  the exact spec-011 mobile experience keeps working.

## Requirements

### A width breakpoint, not a phone/desktop content fork

One new hook, `useWideWeb()` (`src/web/useWideWeb.ts`): `Platform.OS ===
'web' && useWindowDimensions().width >= 960`. Everything in this spec is
gated on it, **additively** — every existing mobile/native code path stays
exactly as it is; wide-web variants are new branches next to them, not
replacements. `960` was picked to comfortably fit sidebar (232) + a
reasonably wide content column + rail (300) without cramping; resizing the
browser crosses it live (`useWindowDimensions` is reactive).

### Universal fix: `Screen` caps content width on web

Regardless of the breakpoint, `Screen` gets a max content width
(`720px`, centered) whenever `Platform.OS === 'web'`. This alone fixes every
screen that gets no bespoke wide-web treatment below — onboarding, auth,
household settings, every form — with one small, native-safe change. Below
the breakpoint this still applies (a phone browser keeps a sane width too);
it's independent of `useWideWeb()`.

### `WebShell` — sidebar nav (≥ breakpoint only)

`MainScreen` renders `WebShell` instead of the bottom `TabBar` + full-bleed
content when `useWideWeb()` is true. `WebShell`:
- Fixed 232px left column: wordmark, the same 4 nav items `TabBar` has
  (same labels, same pending-proposal badge on Calendario), the signed-in
  parent's initial + name pinned to the bottom.
- Main content region to its right, scrollable, hosting the active tab
  exactly as today (`CalendarTab` / `EventsTab` / `ReceiptsScreen` /
  `HouseholdTab`) — unchanged components, just different outer chrome.
- Below the breakpoint, `MainScreen` renders `TabBar` exactly as it does
  today — bit-for-bit the spec-007 behaviour, on native and on a narrow
  browser alike.

### `WebDialog` — the "push" screens become an overlay

Every tab is a view-state machine where selecting something **replaces**
the whole screen (`DayDetail`, `ProposeOverride`, `PatternSetup`,
`ProposalsList`, `EventForm`, receipt upload, `BalanceDetail`,
`SplitTableView`, `SplitProposeForm`, …). Rather than bespoke wide layouts
for each of them, one reusable wrapper generalizes the pattern: **`≥
breakpoint`, a "push" view renders as a centered modal dialog (`WebDialog`,
RN core `Modal` — same primitive spec 009's `TimeField` sheet already
proved works) over the still-visible base tab; `< breakpoint` or native, it
renders exactly as today (a full replacement).** The sub-view components
themselves (`DayDetail`, `EventForm`, …) do not change at all — only where
they mount.

This keeps the amount of new/bespoke layout work bounded and consistent,
rather than hand-designing ~10 different screens.

### Master-detail: Receipts and Events

The two screens with a genuine list ↔ detail relationship get the real
side-by-side treatment shown in the "C" mockup, **not** `WebDialog`:
- **`ReceiptsScreen`**: `≥ breakpoint` and `view.name === 'detail'`, render
  the list (its own column, ~380px) and `ReceiptDetail` (remaining width)
  side by side. The balance card stays pinned atop the list column on
  *Compartidos*. `BalanceDetail` and `SplitTableView` still use `WebDialog`
  (they're not a list/detail pair) — see above.
- **`EventsTab`**: same shape — the upcoming-events list and `EventDetail`
  side by side at `≥ breakpoint` when `view.name === 'detail'`.
- Below the breakpoint (or `view.name === 'new' | 'edit'`, a form, not a
  detail pairing): unchanged full-replace / `WebDialog` behaviour.

### Calendar side rail (≥ breakpoint only, additive)

`CalendarTab`'s base `{ name: 'calendar' }` view gains a ~300px right rail
next to the month grid (not instead of anything mobile already shows):
pending-proposal card (if any) with the same Aprobar/Rechazar actions,
"Próximos eventos" (next few `upcomingOccurrences`), and a "Balance" mini
tile mirroring the receipts one. Everything the rail shows already exists
on the mobile screen somewhere (the pending banner, the events tab, the
receipts balance card) — the rail is a glanceable additional surface, not
new functionality.

### Pre-household screens (auth, onboarding, create/join)

No sidebar — there's no household yet, so no nav items apply. They get only
the universal `Screen` width cap; no other change.

## Data model

None. No store, repository, or rule changes — this is rendering only.

## Acceptance criteria

1. **Given** a browser window `< 960px` wide, **then** the app renders
   pixel-for-pixel what spec 011 already shipped (bottom tabs, full-replace
   navigation) — this spec changes nothing below the breakpoint.
2. **Given** a window `≥ 960px`, **then** a persistent sidebar replaces the
   bottom tab bar, with the same 4 destinations and pending badge.
3. **Given** any screen with no bespoke wide-web treatment (onboarding, a
   form, household settings), **then** its content is capped at a readable
   width and centered — not stretched edge to edge.
4. **Given** the calendar's base view at `≥ 960px`, **then** a side rail
   shows the pending proposal (if any), upcoming events, and the balance —
   each still actionable (approve/reject from the rail works).
5. **Given** `≥ 960px`, **when** a parent taps a day, a proposal, an event,
   or opens pattern setup / propose / balance detail / the split table,
   **then** it opens as a centered dialog over the calendar/tab (not a full
   navigation) and closing it returns to exactly where they were.
6. **Given** `≥ 960px` and a receipt or event list, **when** one is
   selected, **then** the list and its detail render side by side; picking
   another item swaps the detail pane without losing the list's scroll
   position or filters.
7. **Given** the same interactions performed on native (iOS/Android) or a
   narrow web window, **then** behaviour is identical to before this spec —
   no regression to the proven mobile flows.
8. **Given** `npm test` and `npm run typecheck`, **then** both stay green.

## Verification plan

- **Unit:** `useWideWeb()`'s breakpoint logic (pure enough to test with a
  mocked `useWindowDimensions`); no other new pure logic.
- **Component:** `WebShell` renders the 4 destinations + badge; `WebDialog`
  mounts its children only when `visible`; master-detail renders both panes
  together on a wide viewport and only the detail on a narrow one (mocked
  `useWindowDimensions`).
- **Regression:** the full existing suite (unit + rules) stays green
  unchanged — this spec must not touch any native/mobile behavior.
- **Manual, in a browser:** resize across the breakpoint and confirm the
  criteria above; verify both parents' full spec-011 walkthrough (still
  pending from that spec) now at a comfortable desktop size.
- **Manual, on both pilot phones:** confirm zero visual/behavioural change
  (spec 007/003/004/005/009/010's native acceptance criteria still hold).

## Out of scope

- A tablet-specific (mid-width) layout — the breakpoint is a hard on/off.
- Reworking `MonthGrid`'s internals beyond what the rail needs — the grid
  itself still just gets more breathing room from the width cap.
- Any change to what data exists or how it's stored.
- Keyboard shortcuts, hover states beyond what `Pressable`'s web output
  gives for free, or other desktop-specific interaction polish.

## Verification results (2026-09-16)

Implemented exactly as designed, with one addition beyond the original
draft: the calendar rail's pending-proposal card (§ "Calendar side rail")
carries real Aprobar/Rechazar buttons wired to `custody.resolve`, not just a
link out to the proposals list — matches criterion 4 ("each still
actionable") literally.

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `< 960px` renders pixel-for-pixel as spec 011 | ✅ — every wide-web branch is gated behind `useWideWeb()`; nothing below the breakpoint changed |
| 2 | `≥ 960px` → persistent sidebar (`WebShell`), same 4 destinations + badge | ✅ `src/components/WebShell.tsx`, wired in `MainScreen.tsx` |
| 3 | Screens with no bespoke treatment get the width cap | ✅ `Screen`'s `webCap` (720px, centered) — unconditional on web, independent of the breakpoint |
| 4 | Calendar side rail: pending proposal (actionable) + upcoming events + balance | ✅ `CalendarTab`'s wide-web branch — `calendar-rail-pending` (approve/reject), `calendar-rail-upcoming`, `calendar-rail-balance` |
| 5 | `≥ 960px` push views open as a `WebDialog` over the base tab | ✅ `CalendarTab`, `EventsTab`, `ReceiptsScreen` all route their "push" states through `WebDialog` on wide web |
| 6 | Receipts/Events: list + detail side by side, selecting swaps only the detail pane | ✅ master-detail columns in both screens; list stays mounted (scroll/filters preserved since it isn't unmounted) |
| 7 | No regression to native/narrow-web behaviour | ✅ full existing suite green throughout; every new code path is additive behind `useWideWeb()` |
| 8 | `npm test` + `npm run typecheck` stay green | ✅ 39 suites / 232 tests, `tsc --noEmit` clean; `npm run test:rules` also re-run clean (unaffected, no rules touched) |

**Automated:** unit test for `useWideWeb()`'s breakpoint logic
(`src/web/__tests__/useWideWeb.test.ts`); component tests for `WebShell`
(destinations, badge, onChange, sign-out) and `WebDialog` (mounts children
only when visible, backdrop closes) under `src/components/__tests__/`;
wide-web integration tests per screen — `calendarTab.wideWeb.test.tsx`
(rail rendering, dialog-over-calendar, rail navigation, rail proposal
resolve), `eventsTab.wideWeb.test.tsx` and `receiptsScreen.wideWeb.test.tsx`
(master-detail rendering, dialog-over-list) — all passing.

**Manual, in a browser:** deployed to https://da2-coparenting.web.app; the
user confirmed the wide-window layout "looks fine" (2026-09-16) — a visual
spot-check of the sidebar/rail/master-detail chrome, not a full functional
pass. Still pending: exercising each criterion (proposal approve/reject
from the rail, master-detail selection swapping only the detail pane, a
push dialog closing back to the right place) and the still-outstanding
spec-011 full walkthrough (calendar, events, receipts, split, cross-device
sync) at a comfortable desktop size — folding that into one combined
verification pass covering 003/010/011/012 together, same as noted in
spec 011.

**Manual, on both pilot phones:** not yet re-confirmed after this spec;
expected to be a no-op since every native code path is unchanged, but still
needs an explicit pass per spec 006's process.
