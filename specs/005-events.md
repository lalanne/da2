# 005 — Kid Events

**Status:** draft
**Depends on:** 004 (and thereby 007)

## User stories

- As a parent, I add a kid's event — doctor appointment, birthday party,
  tournament, training session — so both of us can see it.
- As a parent, I see events as dots on the custody calendar and can tap a day
  to read them, so I know what happens on "my" days vs the co-parent's.
- As a parent, I open an "Eventos" tab to see everything coming up.
- As a parent, when the other parent adds or changes an event I see it in
  real time (OS push is spec 008).

## Requirements

- Event fields: `title`, `type` (`doctor | birthday | tournament | training |
  school | other`), `childIds` (0..n — 0 means "concerns the household"),
  `date`, `allDay`, `startTime` / `endTime` (`HH:mm`, household-local, when
  not all-day), `location` (free text), `notes` — all optional except
  `title`, `type` and `date`.
- **Recurrence:** only `type == 'training'` may recur — `{ freq: 'weekly',
  until: <date> }`, expanded client-side to every 7th day from `date` through
  `until` inclusive. Everything else is single-occurrence. Enforced in the
  security rules and the form.
- **No propose/approve** — an event doesn't reassign custody. Either parent
  creates, edits or deletes any event; changes are visible to both in real
  time via the listener.
- **Whole-series edits only in v1** — editing or deleting a recurring
  training changes/removes every occurrence. Per-occurrence exceptions
  ("skip this Tuesday") are out of scope.
- Calendar integration (spec 004): the month cell shows the custody tint plus
  up to 3 single-colour event dots ("+N" past 3); tapping a day opens the day
  detail with the full event list under the custody segments.
- The **Eventos tab** (a third bottom tab) lists upcoming occurrences from
  today, in the household timezone, next ~90 days capped at ~30 items, with
  `＋ Agregar evento`.

## Acceptance criteria

1. **Given** parent A creates "Dentista, 12 oct, 15:00" for child Ana,
   **then** parent B sees it on 12 oct in the calendar (a dot) and at the top
   of the Eventos list without refreshing.
2. **Given** a weekly training on Tuesdays until 15 dic, **then** every
   Tuesday from `date` through 15 dic shows the event and no Tuesday after it
   does.
3. **Given** parent B edits the dentist time to 16:00, **then** both see
   16:00 in real time (calendar day detail and Eventos list).
4. **Given** parent B deletes an event, **then** it disappears for both
   parents everywhere it showed.
5. **Given** a day that has a custody colour and one or more events, **then**
   the month cell shows the tint plus the event dot(s), and tapping it opens
   the day detail listing every event for that day (including a recurring
   occurrence that lands on it).
6. **Given** a user not in the household, **then** the security rules let
   them read and write nothing under `events`.
7. **Given** an edit, **then** `createdBy` and `createdAt` are unchanged and
   `updatedBy` / `updatedAt` reflect the editor (rules-enforced).
8. **Given** a non-training event, **then** the form offers no recurrence
   option and the rules reject a `recurrence` value on it.

## Data model

```
households/{hid}/events/{eventId}
  title: string
  type: 'doctor' | 'birthday' | 'tournament' | 'training' | 'school' | 'other'
  childIds: string[]                 // 0..n; ids from households/{hid}.children
  date: string                       // 'yyyy-mm-dd' — first (or only) occurrence
  allDay: boolean
  startTime: string | null           // 'HH:mm'
  endTime: string | null
  location: string | null
  notes: string | null
  recurrence: null | { freq: 'weekly', until: string }   // only when type == 'training'
  createdBy: string (uid)
  createdAt: timestamp
  updatedBy: string (uid)
  updatedAt: timestamp
```

## Implementation notes

**Pure expansion (`src/events/`), unit-tested** — reuses `src/custody/dates`:

```
occurrencesInRange(event, rangeStart, rangeEnd) → string[]   // yyyy-mm-dd list
  - non-recurring: [event.date] if in range
  - weekly: event.date, +7, +14 … while <= min(recurrence.until, rangeEnd)
upcomingOccurrences(events, today, horizonDays, limit)
  → [{ event, date }] sorted by (date, startTime), capped
eventsForDay(events, date) → Event[]                          // occurrence lands on date
```

**Query strategy** — one listener on `households/{hid}/events`
(`orderBy date`); expand recurrences client-side for the visible month and
the upcoming window. No Firestore composite index.

**Store** (`src/store/eventsStore.ts`) — mirrors `custodyStore`: `start(hid,
uid)` / `stop`, `events`, `create`, `update`, `remove`, `isSubmitting`,
`actionError`. Repository does `addDoc` / `updateDoc` / `deleteDoc`.

**Security rules (`households/{hid}/events/{id}`):**

- `read`: member.
- `create`: member && `createdBy == uid()` && `updatedBy == uid()` &&
  valid `type` && `title` non-empty && `date` a string &&
  (`recurrence == null || (type == 'training' && recurrence.freq == 'weekly'
  && recurrence.until is string)`).
- `update`: member && `createdBy` / `createdAt` unchanged &&
  `updatedBy == uid()` && the same `recurrence`/`type` invariant.
- `delete`: member.

**UI:**

- New `EventsTab` (bottom tab #3) — upcoming list + `＋ Agregar evento`;
  tapping an item opens `EventDetail` (edit / delete).
- `EventForm` — title, type picker, child multi-select (defaults to all),
  date, all-day toggle + start/end time, location, notes; when
  `type == 'training'`, a "se repite cada semana" toggle + `until` date.
  Validation extracted to a pure `buildEventInput`.
- `MonthGrid` (spec 004) gains an `eventsByDate: Map<string, number>` prop
  and renders the dot row. `DayDetail` gains an events section below the
  custody segments, each row tappable → `EventDetail`.

## Verification plan

- **Unit** (`src/events/__tests__/`): `occurrencesInRange` (single, weekly,
  `until` clamping, range edges), `upcomingOccurrences` ordering + cap,
  `eventsForDay`; `buildEventInput` validation (missing title, bad
  date/time, end-before-start, recurrence on non-training).
- **Store**: create / update / remove transitions, in-flight guard,
  error-code surfacing.
- **Rules** (`firebase/tests/`): criterion 6 (non-member denied), criterion
  7 (immutable `createdBy`), criterion 8 (recurrence only on training).
- **Manual on both pilot phones**: the mother adds a real appointment and a
  weekly training; the father sees both (calendar dots + Eventos list); the
  father edits the time, deletes one — the mother sees each change live.

## Out of scope

- Per-occurrence exceptions / "this and following" edits.
- Recurrence for non-training types, or non-weekly recurrence.
- Colour-by-type event dots (single colour in v1).
- RSVP / attendance confirmation.
- Reminders ("1 hora antes") — v1 shows events, spec 008 pushes on
  create/edit/delete.
- Sync to Google / Apple Calendar.
