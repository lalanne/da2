# 009 — Date & time input

**Status:** implemented
**Depends on:** 007 (primitives). **Touches:** 002, 003, 004, 005 — every
screen that currently takes a date or time as free text.

Cross-cutting, like 006 and 007: it replaces an input pattern used across
several feature specs rather than adding a feature of its own.

## Problem

Every date is typed as `AAAA-MM-DD` and every time as `HH:MM`, guarded only
by a regex with a "usa el formato…" error. It is slow, error-prone, and
unfriendly — a parent adding a receipt or an event shouldn't have to format a
date by hand.

Fields affected:

| Spec | Screen | Field(s) |
|---|---|---|
| 002 | `CreateHouseholdScreen` | child `birthdate` (optional, `max` = today) |
| 003 | `ReceiptUpload` | `expenseDate` |
| 004 | `PatternSetup` | `anchorDate`; `changeoverTime`; `effectiveFrom` (`min` = anchor) |
| 004 | `ProposeOverride` | `from` / `to` times (optional — the day itself is already chosen) |
| 005 | `EventForm` | `date`; `startTime` / `endTime` (optional); `until` recurrence-end date (`min` = date) |

## User stories

- As a parent, I pick a date from a calendar — I never type one and never see
  a format error.
- As a parent, I pick a time from a short list instead of typing `HH:MM`.

## Requirements

- **Two new primitives** in `src/components/` — `DateField` and `TimeField` —
  added to spec 007's primitive table (amendment). Screens stop passing
  `keyboardType` / `datePlaceholder` for dates and times.
- **Pure JS, no native module.** No `@react-native-community/datetimepicker`.
  The calendar reuses `src/custody/dates.ts` (`daysInMonth`, `startOfMonth`,
  `addMonths`, `weekdayMonday0`, `todayInTimezone`) and mirrors the month grid
  the calendar screen already renders. Ships to the pilot via `eas update`
  (Path A) — no build, no data change, no rules change.
- **Storage is unchanged.** Dates stay `yyyy-mm-dd` strings, times stay
  `HH:mm` strings, in Firestore exactly as today. This is an input-layer
  change only — no migration.
- The existing `isIsoDate` / `isHhMm` checks **stay** in the `buildXInput`
  functions as defensive guards; they simply become unreachable from the UI.
  The `badDate` / `badTime` strings stay (dead) rather than being deleted.

### `DateField`

| Prop | |
|---|---|
| `label` | field label |
| `value` | `string \| null` — `yyyy-mm-dd` |
| `onChange` | `(value: string \| null) => void` |
| `optional` | when true, allows clearing back to `null`; otherwise `value` is always a date |
| `min` / `max` | optional `yyyy-mm-dd` bounds — out-of-range days are shown disabled |
| `timezone` | household tz, for "today" |

- Closed: a tappable row (same height/box as `TextField`) showing the date
  **formatted for humans** — `"12 sep 2026"` — or, when `optional` and unset,
  the label's placeholder plus a subtle "＋" affordance.
- Open: the month grid renders **directly below the field in normal layout
  flow** (the forms already scroll) — no modal, no overlay, no measuring.
  Month title with `‹` / `›`, Monday-first weekday row, 6-week grid,
  other-month days dimmed, **today ringed**, **selected filled `accent`**,
  disabled (out of `min`/`max`) days faint and non-tappable.
- A `Hoy` text button jumps to the current month and selects today.
- Tapping a day emits `yyyy-mm-dd` and collapses the grid. Tapping the field
  again also collapses it. When `optional`, a `Quitar fecha` action emits
  `null`.
- Human formatting: a `formatCivilDate(iso)` helper → `"12 sep 2026"` using
  Spanish month abbreviations from `src/i18n/strings.ts` (es-CL only, like the
  rest of the UI).

### `TimeField`

| Prop | |
|---|---|
| `label` | field label |
| `value` | `string \| null` — `HH:mm`, 24-hour; `null` = no time set |
| `onChange` | `(value: string \| null) => void` |
| `optional` | when true, the sheet offers "Sin hora" → `null`; otherwise always a time |
| `stepMinutes` | default `15` |

- Closed: a tappable row showing `HH:mm` (24-hour, matching `formatMinutes`),
  or a placeholder when `optional` and `value` is `null`.
- Open: a **bottom sheet** (RN core `Modal`, dimmed backdrop, rounded top,
  drag handle) containing a scrollable list of every `HH:mm` at `stepMinutes`
  from `00:00` to `23:45`, preceded by a "Sin hora" row when `optional`. On
  open it scrolls so the **current value is centred** (nearest step if not on
  the grid; a sensible default when `null`). The selected row is `accentSoft`
  + a check.
- Tapping a row emits its value (or `null` for "Sin hora") and closes the
  sheet. Backdrop tap closes without changing the value.

## Acceptance criteria

1. **Given** any date field, **when** tapped, **then** a month grid opens
   inline below it with **no keyboard**, showing the month of the current
   value (or today when empty).
2. **Given** the grid open, **when** a day is tapped, **then** the field shows
   it as `"12 sep 2026"`, the grid collapses, and `onChange` fired
   `"2026-09-12"`.
3. **Given** the grid open, **when** `‹` / `›` is tapped, **then** the month
   changes with the selection untouched; **when** `Hoy` is tapped, **then**
   the current month shows and today is selected.
4. **Given** an `optional` date field with no value, **then** it shows the
   placeholder; **when** `Quitar fecha` is tapped, **then** `onChange(null)`
   fires.
5. **Given** `min` / `max` bounds, **then** days outside them are visibly
   disabled and do not respond to taps.
6. **Given** a time field, **when** tapped, **then** a 15-minute list opens in
   a bottom sheet scrolled to the current value; **when** a row is tapped,
   **then** `onChange` fired that `HH:mm` and the sheet closed. **Given** an
   `optional` time field, **when** "Sin hora" is tapped, **then**
   `onChange(null)` fired.
7. **Given** the codebase, **when** grep'd, **then** no screen passes
   `keyboardType` for a date or time input and no reachable `AAAA-MM-DD`
   placeholder remains; `isIsoDate` / `isHhMm` still guard the `buildXInput`
   functions.
8. **Given** specs 004 and 005 (both `verified`), **when** their date/time
   inputs are swapped for the primitives, **then** every existing acceptance
   criterion still passes and `npm test` + `npm run typecheck` stay green.
9. **Given** the change set, **then** it adds no native dependency and ships
   via `eas update` (Path A).

## Verification plan

- **Unit** — month-grid generation (week count, leading/trailing other-month
  days, Feb in a leap year), `formatCivilDate`, time-list generation +
  nearest-step snapping.
- **Component** — `DateField`: opens on tap, day-tap emits ISO + collapses,
  `‹`/`›` nav, `Hoy`, `optional` clear, disabled out-of-range days.
  `TimeField`: sheet opens, row-tap emits `HH:mm` + closes, backdrop tap is a
  no-op. (Screen tests stay render-only — RNTL 14 / React 19 multi-`fireEvent`
  flakiness, per the spec 007 note.)
- **Re-verify 004 + 005** — rerun their acceptance criteria after the swap.
- **Manual on both pilot phones** — add a receipt (date), an event (date +
  time), a custody anchor date; all keyboard-free; values round-trip; Spanish
  month labels read correctly.

## Adoption checklist

- [x] `DateField`, `TimeField`; `formatCivilDate` / `formatMonthYear` in
      `src/i18n/dates.ts`; `monthGrid` in `src/custody/dates.ts`; `dateTime`
      block (short months, labels) in `src/i18n/strings.ts`
- [x] 002 `CreateHouseholdScreen` — birthdate → `DateField optional`, `max` = today
- [x] 003 `ReceiptUpload` — `expenseDate` → `DateField`
- [x] 004 `PatternSetup` — `anchorDate` + `effectiveFrom` (`min` = anchor) →
      `DateField`; `changeoverTime` → `TimeField`
- [x] 004 `ProposeOverride` — `from` / `to` → `TimeField optional`
- [x] 005 `EventForm` — `date` + `until` (`min` = date) → `DateField`;
      `startTime` / `endTime` → `TimeField optional`
- [x] deleted the dead `keyboardType` props + `datePlaceholder` /
      `timePlaceholder` strings (`badDate` / `badTime` guards kept)

## Verification results

Implemented 2026-09-10. Ships OTA (JS + i18n only; no data, rules, or native
change).

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1–5 date field | ✅ | `src/components/__tests__/dateTimeFields.test.tsx` — opens inline, day→ISO, month nav keeps selection, optional placeholder, `max` disables later days. `src/custody/__tests__/dates.test.ts` — `monthGrid` weeks/spill. `src/i18n/__tests__/dates.test.ts` — `formatCivilDate`. |
| 6 time field | ✅ | same component test — sheet opens, row→`HH:mm`, "Sin hora"→`null`. |
| 7 no free-text left | ✅ | grep: no `keyboardType` on a date/time field, no reachable `AAAA-MM-DD`; `isIsoDate`/`isHhMm` still in every `buildXInput`. |
| 8 004/005 still green | ✅ | 187 unit + typecheck; `events.test.tsx`, `pickers.smoke.test.tsx`, `CreateHouseholdScreen.test.tsx` mount the new fields; 004/005 form-logic tests unchanged and green. |
| 9 no native dep | ✅ | `package.json` unchanged; `TimeField` uses RN core `<Modal>` + `<ScrollView>`. |

Test note: jest-expo renders RN `<Modal>` as nothing, so `jest.setup.js` mocks
it to render children when `visible` (a general fixture, not 009-specific).

Manual on both pilot phones — **pending** the next OTA relaunch.

## Design

Canvas: <https://claude.ai/code/artifact/9ea080f1-395e-49a9-9a86-d28916603d30>
— artboards **Selector de fecha** (inline calendar popover) and **Selector de
hora** (15-minute list sheet).

## Out of scope

- Date **range** selection — every field is a single date.
- A native wheel picker — revisit only if the list/grid prove inadequate on
  real phones.
- Locale beyond es-CL — month names are hard-coded Spanish, like the rest of
  the app.
- Relative shortcuts beyond `Hoy` (no "mañana", "próximo lunes").
- Duration / recurring-time pickers.
