# 005 — Kid Events

**Status:** draft
**Depends on:** 004

## User stories

- As a parent, I add a kid's event — doctor appointment, birthday party,
  tournament, training session — so both of us can see it.
- As a parent, I see events overlaid on the custody calendar, so I know
  what happens on "my" days vs the co-parent's days.
- As a parent, I'm notified when the co-parent adds or changes an event.

## Requirements

- Event fields: title, type (doctor | birthday | tournament | training |
  school | other), child(ren), date, start/end time (or all-day), location
  (free text), optional notes.
- Recurring events supported for training sessions only (weekly, until an
  end date); everything else is single-occurrence.
- Events are visible to both parents immediately — no propose/approve
  (unlike custody changes, an event doesn't reassign custody; the parent
  who has the kids that day decides attendance).
- Creator or co-parent can edit/delete; every change notifies the other
  parent (FCM).
- Calendar integration: event dots on the month view (spec 004); tapping a
  day lists that day's events; separate upcoming-events list.

## Acceptance criteria

1. **Given** parent A creates "Dentist, Oct 12, 15:00" for child Ana,
   **then** parent B sees it on Oct 12 in the calendar and in the upcoming
   list without refreshing, and receives a push notification.
2. **Given** a weekly training event Tuesdays until Dec 15, **then** every
   Tuesday through Dec 15 shows the event and no Tuesday after it does.
3. **Given** parent B edits the dentist time to 16:00, **then** parent A is
   notified and both see 16:00.
4. **Given** parent B deletes an event, **then** it disappears for both and
   parent A is notified of the deletion (notification includes what was
   deleted).
5. **Given** a day with both a custody color and events, **then** the month
   cell shows the custody tint plus event dot(s), and tapping opens the day
   detail with the full list.
6. Only household members can read or write events (security rules).

## Data model

```
households/{hid}/events/{eventId}
  title: string
  type: 'doctor' | 'birthday' | 'tournament' | 'training' | 'school' | 'other'
  childIds: string[]
  date: date                      // first occurrence
  allDay: boolean
  startTime: string | null        // 'HH:mm'
  endTime: string | null
  location: string | null
  notes: string | null
  recurrence: null | { freq: 'weekly', until: date }
  createdBy: string (uid)
  createdAt: timestamp
  updatedAt: timestamp
```

## Out of scope

- RSVP / attendance confirmation.
- Reminders ("1 hour before") — v1 notifies on create/edit/delete only.
- Sync to Google/Apple Calendar.
