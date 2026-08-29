# 004 — Custody Calendar

**Status:** draft
**Depends on:** 002

## User stories

- As a parent, I see a month calendar where every day is color-coded by which
  parent has the kids.
- As a parent, I set up our recurring custody pattern once and the calendar
  fills itself indefinitely.
- As a parent, I propose a change (a day swap, or a new pattern) and it only
  takes effect when my co-parent approves it.
- As a parent, I'm notified when my co-parent proposes a change or responds
  to mine.

## Requirements

### Pattern

- Preset patterns: alternating weeks, every-other-weekend, 2-2-3, plus a
  custom weekly/biweekly grid (each day of the cycle assigned to parent A/B).
- Pattern has an anchor date (cycle start) so any future date is computable.
- Calendar rendering = pattern computed per day, then overrides applied on
  top. No materializing years of day-documents.

### Overrides & proposals (propose → approve)

- Initial pattern setup by the first parent requires the co-parent's
  approval before the calendar becomes active.
- Any later change — single-day override or pattern replacement — is created
  as a **proposal**: `pending` → `approved` | `rejected`.
- Only the non-proposing parent can approve/reject. Proposer can cancel
  while pending.
- Approved single-day overrides are stored per date; approved pattern changes
  take effect from a stated start date (history before it is unaffected).
- Push notification (FCM) to the other parent on: new proposal, approval,
  rejection.

### Display

- Month view, each day tinted with the custody parent's color; "today"
  marked; pending proposals visibly badged on affected days.
- Both parents see identical data in real time.

## Acceptance criteria

1. **Given** a household with no pattern, **when** parent A configures
   alternating weeks anchored on a Monday and parent B approves, **then**
   both parents see the same correctly alternating month view, including
   months a year ahead.
2. **Given** an active pattern, **when** parent A proposes swapping a
   specific day to themselves, **then** parent B receives a push
   notification and sees the proposal; the calendar still shows the old
   assignment (with a pending badge) until B acts.
3. **Given** a pending proposal, **when** B approves, **then** the day
   changes color for both parents in real time and A is notified.
4. **Given** a pending proposal, **when** B rejects, **then** the calendar
   is unchanged and A is notified.
5. **Given** a pending proposal, **then** the proposing parent cannot
   approve it themselves (enforced by security rules, not just UI).
6. **Given** an approved pattern change starting next month, **then** days
   before the start date render with the old pattern, days after with the
   new one.
7. A parent not in the household can read none of this (security rules).

## Data model

```
households/{hid}/custody/config     // singleton doc
  activePatternId: string | null

households/{hid}/custody/patterns/{patternId}
  type: 'alternating-weeks' | 'every-other-weekend' | '2-2-3' | 'custom'
  cycleDays: string[]               // for custom: ['A','A','B',...] per cycle day
  anchorDate: date
  effectiveFrom: date
  status: 'pending' | 'active' | 'superseded' | 'rejected'

households/{hid}/custody/overrides/{yyyy-mm-dd}
  assignedTo: string (uid)
  proposalId: string

households/{hid}/proposals/{proposalId}
  type: 'pattern' | 'day-override'
  proposerId: string (uid)
  payload: map                      // patternId or {date, assignedTo}
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: timestamp
  resolvedAt: timestamp | null
```

## Out of scope

- Multi-child differing schedules (v1: one schedule for all kids).
- Holiday/vacation rule engines.
- Export/sync to external calendars.
