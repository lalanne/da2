# 002 — Household Linking (Invite Code)

**Status:** implemented
**Depends on:** 001

## User stories

- As the first parent, I create a household, add my kids' names, and get an
  invite code to send to my co-parent.
- As the second parent, I enter the invite code and I'm linked into the same
  household, seeing the same kids.
- As either parent, I can see who else is in my household.
- As the first parent, while I'm still the only member, I can regenerate the
  invite code (e.g. if I sent it to the wrong person); the old code stops
  working.

## Requirements

- A household has exactly 2 parent slots and 1..n children.
- One household per parent (v1). A user already in a household cannot create
  or join another.
- Invite code: short, human-shareable — 8 characters from an unambiguous
  alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, i.e. no `0/O/1/I`), used as the
  `inviteCodes` document id. Single-use: consumed when the second parent
  joins. **No time expiry in v1** (revisit later). A household has at most one
  live code at a time; regenerating deletes the previous code document.
- After sign-in, a user with `householdId == null` is routed to a
  create-or-join screen; a user with a household goes straight to the app.
- The join is **effectively atomic from the user's point of view**: it either
  completes (code consumed, both parents linked, joiner sees the kids) or the
  user can safely retry until it does. Redeeming the code is the single
  authoritative gate; the remaining writes are idempotent and a half-finished
  join is repaired on the next app launch (see Implementation notes).

## Data model

```
households/{id}
  name: string                       // entered by the creator, e.g. "García kids"
  parentIds: string[]                // length 1 or 2; parentIds[0] is the creator
  children: Array<{                  // length >= 1
    id: string                       // client-generated, stable (used by specs 004/005)
    name: string
    birthdate: string | null         // ISO yyyy-mm-dd
  }>
  pendingInviteCode: string | null   // the live unredeemed code; null once redeemed
  createdBy: string (uid)
  createdAt: timestamp

inviteCodes/{code}                   // code (see alphabet above) is the document id
  householdId: string
  createdBy: string (uid)
  createdAt: timestamp
  redeemedBy: string | null          // set to the joiner's uid at redemption

users/{uid}                          // extends spec 001
  householdId: string | null         // already present from 001
  joinedVia: string | null           // invite code this user redeemed; null for the creator
```

Children live as an array on the household document (not a subcollection):
n is small, it keeps household creation a single write, and the stable `id`
per entry is all specs 004/005 need.

## Acceptance criteria

1. **Given** a signed-in user with `householdId == null`, **when** they create
   a household with a name and at least one child, **then** the household
   exists with them as `parentIds[0]`, their `users` doc has that
   `householdId`, and an invite code is displayed with a share button.
2. **Given** a household with one parent and a live code, **when** the second
   parent enters that code, **then** after the join settles both users have
   the same `householdId`, `parentIds` has both uids, the code's `redeemedBy`
   is the joiner, `pendingInviteCode` is null, and each parent can see the
   other's display name in household settings.
3. **Given** a code that is unknown or already redeemed, **when** a user
   submits it, **then** they see a clear error and remain unlinked
   (`householdId` still null).
4. **Given** a household that already has 2 parents, **then** no code for it
   is redeemable and the regenerate action is unavailable.
5. **Given** a user who already has a `householdId`, **then** the create and
   join screens are unreachable (routing sends them into the app), and the
   security rules reject a second household creation or join.
6. **Given** the first parent is still the only member, **when** they
   regenerate the code, **then** the previous `inviteCodes` document is gone
   (old code now errors per criterion 3) and a new one is shown.
7. **Given** a join that is interrupted after the code is claimed (its
   `redeemedBy` is set and the joiner's `joinedVia` records the code) but
   before the link writes land, **when** the joiner reopens the app, **then**
   the join completes automatically and they land in the household — no stuck
   state, no re-entering the code. (A crash in the sub-second window between
   the two claim writes is recovered by re-entering the same code, which the
   join screen detects as already-mine and resumes.)
8. Security rules:
   - Only household members (`parentIds`) can read a household document and
     its `children`.
   - Any authenticated user can `get` a single `inviteCodes/{code}` by id
     (needed to redeem) but cannot `list` the collection.
   - A non-member can set `redeemedBy` on a code to their own uid, only when
     it is currently null and the target household has exactly one parent;
     they cannot modify anything else on the code.
   - A user can only add themselves as `parentIds[1]` of a household whose
     live code they have already redeemed (`redeemedBy == their uid`), and
     only as a 1 → 2 append that leaves `parentIds[0]` untouched and sets
     `pendingInviteCode` to null.
   - A user may only change their own `users` doc's `householdId` /
     `joinedVia` (spec 001's name/email/photo fields are write-once at
     create), and only in the shapes the Claim/Link steps produce.
   - A user can `get` the `users` document of a co-member of their household
     (to show the other parent's name); `list` on `users` is denied.

## Implementation notes

**Routing.** `App.tsx` gains a third branch between auth and `MainScreen`:
`user && profile.householdId == null` → `CreateOrJoinScreen`. The profile
(with `householdId`) is loaded into the auth store after sign-in and kept on
a Firestore listener so a completed join flips the screen automatically.

**Create (creator's own device, no atomicity concern — repaired on launch if
half-done):**
1. `batch`: create `households/{id}` with `parentIds: [me]`, the children
   array, `pendingInviteCode: C`; create `inviteCodes/{C}`.
2. `update users/{me}.householdId = id`.
If step 2 is lost, launch repair finds a household with `parentIds == [me]`
and no `users.householdId` and sets it.

Firestore security rules can only `get()` **committed** state, so a rule on
one write in a batch cannot see a sibling write in the same batch. That forces
the ordering below — each `get()` a later rule depends on has already
committed.

**Claim (two ordered single-doc writes; the authoritative gate):**
1. `update inviteCodes/{C}`: `redeemedBy = U`. Rule: `redeemedBy` was null,
   the new value is U's own uid, nothing else changes, and
   `households/{C.householdId}` still has one parent. Knowing `C` (the
   document id) is what authorizes this. If `redeemedBy == U` already (an
   earlier interrupted attempt), the join screen skips to step 3.
2. `update users/{U}`: `joinedVia = C` (only that key; `householdId` stays
   null). Rule: `get(inviteCodes/C).redeemedBy == U` — committed by step 1.

**Link (one batch):**
3. `batch`: `households/{H}` — `arrayUnion` U into `parentIds`, set
   `pendingInviteCode = null`; `users/{U}` — set `householdId = H`. Both
   rules check `get(inviteCodes/C).redeemedBy == U` (C from
   `households.pendingInviteCode` / `users.joinedVia`), committed since
   step 1. `arrayUnion` and the fixed field values make this idempotent.

**Launch repair.** On every app start, after the first profile snapshot:
- `joinedVia != null && householdId == null` → run step 3.
- `householdId != null && U not in households/{householdId}.parentIds` → run
  step 3's household write.
`inviteCodes/{C}.redeemedBy == U` is the durable proof that authorizes the
repair. The only state repair cannot reach unaided is a crash between steps 1
and 2 (both `await`s back-to-back); re-entering the same code resumes from
step 2.

**Regenerate.** `batch`: delete `inviteCodes/{old}`, create `inviteCodes/{new}`,
set `households/{H}.pendingInviteCode = new`. Rule allows only when
`parentIds.size() == 1` and the caller is `parentIds[0]`.

**Code generation.** 8 chars from the 31-char alphabet ≈ 2.5×10¹² space,
single-use — collision and guessing are non-issues at pilot/v1 scale. Generate
client-side; on the ~never write-collision, regenerate and retry.

## Verification plan

Same layering as spec 001: unit tests for the store/repository logic
(create, join, resume-interrupted-join, regenerate, error mapping), Firestore
rules tests for criterion 8 and the adversarial paths in 3/4/5, and a manual
checklist on both pilot phones (mother creates the real household with the 3
kids, father joins with the real code). Spec is `verified` only after the
manual checklist passes on both phones (spec 006).

| Criterion | Layer | How |
|-----------|-------|-----|
| 1 create | Unit + manual | Unit: create writes household + children + code + user. Manual: mother creates the household. |
| 2 join links both | Unit + rules + manual | Unit: join settles to both linked. Rules: joiner's writes allowed only with redeemed code. Manual: father joins. |
| 3 bad code | Unit + rules | Unit: unknown / redeemed code → error, still unlinked. Rules: redeem of a non-null `redeemedBy` denied. |
| 4 full household | Rules | Redeem denied when `parentIds.size() == 2`; regenerate hidden/denied. |
| 5 already in a household | Unit + rules | Unit: routing skips create/join. Rules: second create and second redeem denied. |
| 6 regenerate | Unit + rules | Unit: old code doc deleted, new shown. Rules: only the sole member can regenerate. |
| 7 interrupted join resumes | Unit | Simulate step-1-only and partial step-2 states → launch repair completes the link. |
| 8 rules | Rules tests | Full matrix: non-member read denied, `get` vs `list` on codes, redeem constraints, `parentIds` append constraints, co-member `users` read. |

## Out of scope

- Removing/replacing a parent, deleting a household.
- More than 2 parents/guardians.
- Multiple households per parent.
- Time-based code expiry (no `expiresAt` in v1).
