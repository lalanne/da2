# 002 — Household Linking (Invite Code)

**Status:** draft
**Depends on:** 001

## User stories

- As the first parent, I create a household, add my kids' names, and get an
  invite code to send to my co-parent.
- As the second parent, I enter the invite code and I'm linked into the same
  household, seeing the same kids.
- As either parent, I can see who else is in my household.

## Requirements

- A household has exactly 2 parent slots and 1..n children.
- One household per parent (v1). A user already in a household cannot create
  or join another.
- Invite code: short, human-shareable (8 chars, unambiguous alphabet — no
  0/O/1/I), single-use, expires when redeemed or after 30 days.
- After sign-in, a user with `householdId == null` is routed to a
  create-or-join screen; a user with a household goes straight to the app.
- Joining is atomic: the second parent either fully joins (code consumed,
  both linked) or nothing changes.

## Acceptance criteria

1. **Given** a new user, **when** they create a household with at least one
   child, **then** the household exists with them as parent 1 and an invite
   code is displayed with a share button.
2. **Given** a valid unredeemed code, **when** the second parent enters it,
   **then** both users have the same `householdId`, the code is no longer
   redeemable, and each parent can see the other's name in household settings.
3. **Given** an invalid, expired, or already-redeemed code, **when** a user
   submits it, **then** they see a clear error and remain unlinked.
4. **Given** a household that already has 2 parents, **then** its code cannot
   be redeemed by anyone (and no new code can be generated).
5. **Given** a user already in a household, **then** the create/join screens
   are unreachable.
6. Security rules: only household members can read household and children
   data; a non-member holding a code can redeem it but cannot read anything
   before redemption.

## Data model

```
households/{id}
  name: string                  // e.g. "García kids"
  parentIds: string[]           // length 1 or 2
  createdBy: string (uid)
  createdAt: timestamp

households/{id}/children/{childId}
  name: string
  birthdate: date | null

inviteCodes/{code}              // code as document id
  householdId: string
  createdBy: string (uid)
  createdAt: timestamp
  redeemedBy: string | null
  expiresAt: timestamp
```

## Out of scope

- Removing/replacing a parent, deleting a household.
- More than 2 parents/guardians.
- Multiple households per parent.
