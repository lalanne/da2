# 004 — Custody Calendar

**Status:** implemented
**Depends on:** 002, 007 (built on the design-system primitives; owns the
`parentA` / `parentB` colour semantics whose token slots 007 reserves)

## User stories

- As a parent, I see a month calendar where every day is coloured by which
  parent has the kids — and split-coloured on the day custody changes over.
- As a parent, I set up our recurring custody pattern once and the calendar
  fills itself indefinitely, past and future.
- As a parent, I propose a change (a day swap, or a new pattern) and it only
  takes effect when my co-parent approves it.
- As a parent, the moment I open the app I can see there's a change waiting
  for my response, and the other parent sees when I've responded.

## Requirements

### The custody pattern

- A pattern is a **cycle array + anchor date + changeover time**:
  - `cycle`: an array of parent indices (`0` = `parentIds[0]`, `1` =
    `parentIds[1]`), one entry per day of the cycle. Length 7 (weekly) or 14
    (biweekly).
  - `anchorDate`: the calendar day that is cycle position 0. Any date's
    position is `daysSince(anchorDate) mod cycle.length`.
  - `changeoverTime`: `"HH:mm"` in the household's timezone, applied at every
    point in the cycle where the assigned parent changes.
- The preset buttons (alternating weeks, every-other-weekend, 2-2-3) just
  **generate a `cycle` array** — there is one computation path, not four.
  `presetLabel` is kept for display only.
- A "custody day" runs changeover-to-changeover, so a calendar day can belong
  to two parents: `[00:00, changeoverTime)` to the parent of the custody day
  that started yesterday, `[changeoverTime, 24:00)` to today's.
- Patterns form a timeline: each approved pattern has an `effectiveFrom`
  date and governs all dates `>= effectiveFrom` until a later pattern's
  `effectiveFrom`. Dates before the earliest pattern have no custody data.

### Propose → approve

- **Every** change is a `proposal` — the initial pattern, a replacement
  pattern, or a single-day override. `status`: `pending → approved |
  rejected | cancelled`.
- **The approved proposal *is* the record.** There is no separate
  overrides/config collection. The calendar is computed by querying
  `proposals` where `status == 'approved'`. Approving is a **single-field
  write** (`status`), which the security rules fully verify.
- Only the **non-proposing** parent can approve or reject (criterion 5,
  enforced in rules). The proposer can `cancel` while pending.
- A day-override proposal assigns a time slice `[startTime, endTime)` of one
  calendar `date` to a parent; `null` start = `00:00`, `null` end = `24:00`
  (the common "I have them all Saturday" case).
- In-app notification only: a pending proposal the current user did not make
  surfaces as an unmissable banner + count on the calendar (real-time
  listener). **OS push notifications are spec 008**, not this spec.

### Display

- Month view; each day tinted with the custody parent's colour, split-tinted
  (with the changeover time shown) on changeover days. "Today" marked
  according to the **household timezone**, not the device's. Pending
  proposals badge the days they affect.
- Both parents see identical data in real time (same query inputs → same
  deterministic computation).

## Data model

```
households/{hid}
  … (spec 002) +
  timezone: string                 // IANA, e.g. "America/Santiago"; default at
                                   // creation, changeable in household settings

households/{hid}/proposals/{proposalId}
  type: 'pattern' | 'day-override'
  proposerId: string (uid)
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: timestamp
  resolvedAt: timestamp | null
  resolvedBy: string (uid) | null   // who approved/rejected; null while pending / on cancel

  // type == 'pattern'
  cycle: number[]                   // 0 | 1 per cycle day; length 7 or 14
  anchorDate: string               // 'yyyy-mm-dd'
  changeoverTime: string           // 'HH:mm'
  effectiveFrom: string            // 'yyyy-mm-dd'
  presetLabel: 'alternating-weeks' | 'every-other-weekend' | '2-2-3' | 'custom'

  // type == 'day-override'
  date: string                     // 'yyyy-mm-dd'
  assignedTo: number               // 0 | 1
  startTime: string | null         // 'HH:mm' | null (= 00:00)
  endTime: string | null           // 'HH:mm' | null (= 24:00)
```

Colours: `parentIds[0]` → `theme.colors.parentA`, `parentIds[1]` →
`parentB`.

## Implementation notes

**No date library.** Dates are civil `yyyy-mm-dd` strings and times are
`HH:mm` strings — day differences are exact integer arithmetic with no DST
hazard because no real timestamps are crossed. The only timezone-aware call
is "what is today in the household": `Intl.DateTimeFormat('en-CA', { timeZone:
household.timezone }).format(new Date())`. (Hermes ships `Intl` with timezone
data on RN 0.86; the verification plan checks it on-device, with
`expo-localization`'s device timezone as the pilot-acceptable fallback.)

**Pure computation (`src/custody/`), fully unit-tested:**

```
daysBetween(a, b)                 → integer civil-day difference
patternForDate(patterns, date)   → the approved pattern with the greatest
                                   effectiveFrom <= date, or null
custodyDayParent(pattern, date)  → cycle[mod(daysBetween(anchorDate, date), len)]
segmentsForCalendarDay(date, pattern, overrides)
  1. base: split [00:00,24:00) at changeoverTime →
       [00:00, changeover) ← custodyDayParent(pattern, date − 1 day)
       [changeover, 24:00) ← custodyDayParent(pattern, date)
  2. clip approved day-override slices for `date` on top
  3. merge adjacent same-parent segments
  → [{ fromTime, toTime, parentIndex }]  (length 1 = solid, 2 = split)
```

**Apply-on-approve = one write.** `update proposals/{id}` → `{ status:
'approved', resolvedAt, resolvedBy: me }`. The calendar's live query picks it
up; nothing else is written.

**Security rules (`households/{hid}/proposals/{id}`):**

- `read`: `request.auth.uid in household.parentIds`.
- `create`: member && `proposerId == uid()` && `status == 'pending'` &&
  `resolvedBy == null` && per-type shape (pattern: `cycle` is a list of
  0/1 length 7 or 14, `anchorDate`/`changeoverTime`/`effectiveFrom` present;
  day-override: `date` + `assignedTo` in [0,1]).
- `update` — **resolve**: member && `resource.data.proposerId != uid()` &&
  `resource.data.status == 'pending'` && `after.status in
  ['approved','rejected']` && `after.resolvedBy == uid()` &&
  `diff().affectedKeys().hasOnly(['status','resolvedAt','resolvedBy'])`.
- `update` — **cancel**: `resource.data.proposerId == uid()` &&
  `resource.data.status == 'pending'` && `after.status == 'cancelled'` &&
  `diff().affectedKeys().hasOnly(['status','resolvedAt'])`.
- `delete`: `false`.

Criterion 5 ("proposer can't approve own") is exactly the
`resource.data.proposerId != uid()` clause in the resolve branch.

**Query strategy.** v1 subscribes to the whole `proposals` subcollection for
the household (one listener, `orderBy createdAt desc`) and does all filtering
+ computation client-side — a single-field order needs no composite index. A
household accumulates a few proposals a week, so this stays small for years.
Revisit with per-month `where` queries (and the composite indexes they need)
only if a household's proposal count grows large.

**One pending pattern proposal at a time** is a UI rule (a new pattern
proposal is disabled while one is pending); multiple pending day-override
proposals for different dates are allowed. Rules don't enforce the pattern
singleton (a `get` can't enumerate) — the approver simply sees whichever
pending pattern proposals exist.

## Acceptance criteria

1. **Given** a household with no pattern, **when** parent A creates an
   alternating-weeks pattern (cycle `[0,0,0,0,0,0,0,1,1,1,1,1,1,1]`, anchor a
   Monday, changeover `18:00`, effectiveFrom set) and parent B approves,
   **then** both parents see the same month view — solid tints, with the
   weekly changeover day split at 18:00 — and it stays correct for a month a
   year ahead.
2. **Given** an active pattern, **when** parent A proposes a day-override
   assigning a specific Saturday fully to A, **then** parent B sees a pending
   badge on that Saturday and the proposal in the pending list, while the day
   still renders with the pattern's colour until B acts.
3. **Given** a pending proposal, **when** B approves it, **then** the day
   re-renders with the new assignment for **both** parents in real time and
   the proposal records `resolvedBy: B`.
4. **Given** a pending proposal, **when** B rejects it, **then** the calendar
   is unchanged and the proposal records `status: rejected`, `resolvedBy: B`.
5. **Given** a pending proposal, **when** the **proposing** parent tries to
   approve or reject it, **then** the security rules deny the write.
6. **Given** an approved replacement pattern with `effectiveFrom` = the first
   of next month, **then** days in this month render with the old pattern and
   days from the 1st onward render with the new one.
7. **Given** a user not in the household, **then** the security rules let
   them read and write nothing under `proposals`.
8. **Given** a pending proposal the current user did not make, **then** the
   calendar shows an unmissable "cambio pendiente" banner + count on open
   (no refresh); resolving or cancelling it clears the banner for both.
9. **Given** the household timezone differs from a device's timezone,
   **then** "today" is highlighted for the household's date, not the
   device's.

## Verification plan

- **Unit** (`src/custody/__tests__/`): `daysBetween`, `mod`,
  `custodyDayParent` across cycle lengths and negative offsets,
  `patternForDate` timeline selection, `segmentsForCalendarDay` — solid days,
  the changeover split, full-day and partial-day overrides, override on a
  changeover day, merge of adjacent same-parent segments. Preset generators
  produce the expected cycle arrays.
- **Store**: propose / approve / reject / cancel transitions; the pending
  banner appears for the non-proposer only; live re-render on approve.
- **Rules** (`firebase/tests/`): criterion 5 (proposer can't resolve),
  criterion 7 (non-member denied), resolve/cancel key constraints, create
  shape checks.
- **Manual on both pilot phones**: the mother and father set up their real
  custody pattern, propose a real day swap, approve it; both see the same
  colours and the split changeover day; "today" is correct.

## Out of scope

- OS push notifications for proposals → **spec 008** (needs Cloud Functions +
  APNs + a native build).
- More than one changeover time in a pattern (e.g. a different weekday vs
  weekend handover time); sub-hour precision.
- Multi-child differing schedules — v1 is one schedule for all kids.
- Holiday / vacation / school-break rule engines.
- Export or two-way sync to external calendars.
