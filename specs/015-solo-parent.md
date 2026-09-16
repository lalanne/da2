# 015 — Solo parent (using the app without the co-parent)

**Status:** approved
**Depends on:** 002 (household), 004 (custody calendar), 010 (expense
splitting). Touches 003 (receipts) only in how the balance is presented.

## Problem

A non-cooperative co-parent is a common, not an edge, case. Today a parent
in that situation can create a household and sit on a `pendingInviteCode`
forever — but **roughly half the app is inert while they do**, and for one
specific reason.

Spec 004 enforces a rules-level invariant (called out in `CLAUDE.md`): a
proposer may not approve their own proposal —
`resource.data.proposerId != uid()`. Spec 010 copies the same pattern for
split proposals and settlements. With nobody else in the household, nothing
can ever be approved:

| Works solo today | Dead solo today |
|---|---|
| Sign-in, household creation, children | **Custody pattern** — proposal can never be approved, so `approvedPatterns()` is always empty and the calendar sits on its empty state permanently |
| Kid events (005) — no approval involved | **Day overrides** — same |
| Receipts (003) — upload, tag, month/tag filters | **Split table** (010) — proposal can never be approved |
| | **Balance + settlements** — need an active split table and a `parentIds[1]` |

The two things a parent in conflict most needs — a custody record and an
expense ledger — are exactly what's blocked.

Worth noting what is *already* solo-friendly, because it shapes the design:
the custody model stores **parent indices (0 | 1), not uids**
(`PatternProposal.cycle`, `DayOverrideProposal.assignedTo`), and
`parentName()` already falls back to "the other parent" when no uid occupies
that index. The calendar needs no data-model change at all — only the
approval gate.

## User stories

- As a parent whose co-parent won't participate, I use the custody calendar,
  the split table and the balance on my own, without waiting for an approval
  that will never come.
- As that parent, what I record keeps its value if the co-parent ever joins —
  my history isn't thrown away.
- As a parent who joins later, I am **not silently bound** by rules the other
  parent set while I wasn't there; I can accept them or propose different
  ones.
- As either parent, I can never erase the other's record — only add to it.

## Requirements

### 1. Self-approval collapses when the household has one parent

In a household where `parentIds.size() == 1`, a proposal (custody pattern,
day override, split table) and a settlement resolve **immediately on
creation, by the proposer**. Same collections, same documents, same fields —
one conditional in the rules, no parallel data model and no second code path.

This deliberately relaxes a security invariant, so it must be justified:

- **`parentIds` is append-only.** It goes 1 → 2 exactly once via
  `secondParentJoins()`; `regenerateCode()` asserts
  `request.resource.data.parentIds == resource.data.parentIds`;
  `setTimezone()` touches only `timezone`; `allow delete: if false`. There is
  **no path that shrinks a household back to one parent**, so a two-parent
  household can never be downgraded to self-approve. Verified in
  `firestore.rules` as of this spec; a rules test pins it (criterion 9).
- The gate exists to protect a co-parent who is *present*. With none present,
  it protects nobody and only disables the app.

**No new field marks a unilateral decision** — `resolvedBy == proposerId`
already says it, and that is impossible in a two-parent household (the
existing rule forbids it). Unilateral decisions are self-describing.

### 2. The absent co-parent needs an identity

- `Household.coParentName: string | null` — a display name the solo parent
  sets for the absent side ("Cristián"), used everywhere `parentName(1, …)`
  currently falls back to the generic "the other parent". Editable while
  solo; once a real parent joins, their profile `displayName` takes over and
  `coParentName` is ignored (kept, not deleted, for historical labels).
- `ABSENT_CO_PARENT` — a reserved sentinel uid (`'__coparent__'`) used as
  `payerUid` / `payeeUid` on settlements recorded while solo, since those
  fields are uids and there is no second uid to use.
  - Like `resolvedBy == proposerId`, this sentinel is **self-describing**: a
    settlement referencing it was necessarily recorded during the solo
    period. That is exactly the marker requirement 5's two-segment balance
    needs — no extra field.
  - The sentinel is never a real uid, so it can never match
    `request.auth.uid`; rules must reject it appearing in `parentIds`.

### 3. Balance math with one parent

`computeBalance(receipts, settlements, [a, b])` takes two uids today. It gains
a solo form where side B is `ABSENT_CO_PARENT`. The maths is unchanged — the
solo parent is still `parentIds[0]`, the split table still governs, receipts
still freeze `splitPercentA` at share time.

**Sharing a receipt while solo** stays meaningful: it is the act that puts a
receipt into the shared ledger and freezes its split. The co-parent simply
can't see it yet. Spec 003's one-way, irreversible sharing rule is unchanged.

### 4. When the co-parent joins: a review queue, actionable — not read-only

A read-only "here's what was decided" screen would be decoration: a parent who
cannot refuse a 90/10 split is bound by it. But "accept or reject" is the
wrong frame too, because it conflates two different things:

- **Forward-looking rules** (custody pattern, split table) govern what
  happens next. The newcomer must not be silently bound.
- **Historical records** (receipts, recorded payments, days already passed)
  are claims about things that already happened. Rejecting them is
  meaningless — you cannot un-happen last Tuesday.

**Forward-looking rules — actionable through machinery that already exists.**
Both objects are already versioned with an effective date (`effectiveFrom` on
the pattern; "latest approved wins" for the split table). So the newcomer
never "rejects" the old one. They either:
- **Accept** it — it keeps governing and is now genuinely bilateral; or
- **Propose a different one** — the ordinary propose/approve flow, superseding
  it from a date forward, which the *first* parent must then approve.
  Symmetric, no special case, no new flow.

Accepting needs one new field: `acknowledgedBy: string | null` on proposals.
- A proposal is **provisional** when
  `resolvedBy == proposerId && acknowledgedBy == null` — unilateral and not
  yet accepted by the other parent.
- New rule path `acknowledgeProposal()`: member, `parentIds.size() == 2`,
  `resource.data.resolvedBy == resource.data.proposerId`,
  `uid() != resource.data.proposerId`,
  `affectedKeys().hasOnly(['acknowledgedBy'])`,
  `after.acknowledgedBy == uid()`. Nothing else about the document may change.

**Until the newcomer acts, the provisional rule keeps governing**, labelled
*"aún no acordado"*. A calendar showing no schedule at all is worse than one
showing a schedule marked as not-yet-agreed.

**Historical records — read-only, permanently, for both parents.** This is
already the app's design (shared receipts cannot be un-shared or edited;
proposals are never deleted) and it stays that way. Neither parent can erase
the other's record.

**Where it appears:** a card on the calendar and a dedicated review screen off
the Hogar tab — *not* a blocking modal. A wall between a newly-joined parent
and the app would read as hostile in exactly the situation this spec exists
for.

### 5. The two-segment balance

A payment recorded during the solo period moves the balance directly. If those
were permanently unchallengeable, the first parent could author the whole
ledger before inviting. There is no fully clean fix — the balance is
*inherently* one parent's bookkeeping until both are present (the solo parent
could equally skew it by simply not recording money they received). So the app
should be honest about it rather than pretend to resolve it.

Once `parentIds.size() == 2`, the balance renders in **two segments**:
- **"Antes de que te unieras"** — the solo period (settlements carrying
  `ABSENT_CO_PARENT`, and receipts shared before the join), labelled as
  *[parent]'s record*.
- **"Desde que te uniste"** — the agreed period.

The boundary is `Household.coParentJoinedAt`, written in the same update as
`secondParentJoins()`. Settlements are classified by their sentinel (which is
self-describing), receipts by `sharedAt < coParentJoinedAt`. A receipt has no
other marker of when it entered the ledger, and adding one to the spec-003
document would be more invasive than a single household field.

Accepting the split table going forward does **not** retroactively bless the
solo-period ledger. Both totals are shown; the app never merges them into one
authoritative number behind the parents' backs.

While solo, there is only one segment, so it renders exactly as today.

### 6. Framing

No user-facing "modo solo" label. Spec 000 commits to the app being neutral
ground between two co-parents; a mode named after one parent's absence reads
as taking a side. The app simply works, the invite code stays available, and
nothing nags about the empty second seat.

## Data model

Changes are additive; no collection is added or removed.

```
households/{hid}
  coParentName: string | null     // NEW — display name for the absent side
  coParentJoinedAt: number | null // NEW — when parentIds went 1 -> 2; the
                                  // boundary requirement 5 splits the balance on

households/{hid}/proposals/{id}          (spec 004)
households/{hid}/splitProposals/{id}     (spec 010)
  acknowledgedBy: string | null   // NEW — uid of the parent who accepted a
                                  // unilateral decision after joining

households/{hid}/settlements/{id}        (spec 010)
  payerUid / payeeUid             // may be ABSENT_CO_PARENT ('__coparent__')
                                  // when recorded during the solo period
```

Unilateral approval is denoted by the **existing** `resolvedBy == proposerId`;
solo-period settlements by the **existing** `payerUid`/`payeeUid` carrying the
sentinel. No status enum changes.

## Acceptance criteria

1. **Given** a household with one parent, **when** that parent proposes a
   custody pattern, **then** it is approved immediately (`status: 'approved'`,
   `resolvedBy == proposerId`) and the calendar paints it — no pending state,
   no waiting.
2. **Given** the same household, **when** the parent sets a split table and
   records a settlement, **then** both resolve immediately and the balance
   computes against `ABSENT_CO_PARENT`.
3. **Given** a household with **two** parents, **when** either proposes
   anything, **then** the existing spec-004/010 behaviour is unchanged —
   self-approval is rejected by the rules exactly as today.
4. **Given** a solo parent who set `coParentName`, **then** the calendar
   legend, day detail and balance all show that name rather than the generic
   "the other parent".
5. **Given** a co-parent joins a household that has unilateral decisions,
   **then** they land in the app normally (no blocking screen) and see a
   review card listing what is in effect, with each item marked *"aún no
   acordado"*.
6. **Given** the review queue, **when** the newcomer taps Accept on the
   pattern, **then** `acknowledgedBy` is set to their uid, the "aún no
   acordado" label disappears, and nothing else about the proposal changes.
7. **Given** the review queue, **when** the newcomer instead proposes a
   different pattern, **then** it goes through the ordinary propose/approve
   flow, the first parent must approve it, and the superseded pattern remains
   in history.
8. **Given** two parents and a solo-period ledger, **then** the balance shows
   two separately-labelled segments, and accepting the split table does not
   merge or re-label the solo-period one.
9. **Rules:** `parentIds` can never shrink from 2 to 1 (pinned by a test, so a
   future edit can't silently re-enable self-approval in a two-parent
   household); `ABSENT_CO_PARENT` is rejected if it ever appears in
   `parentIds`; `acknowledgeProposal()` is rejected when the actor is the
   proposer, when the decision wasn't unilateral, or when it touches any field
   other than `acknowledgedBy`.
10. **Given** any historical record (a shared receipt, a resolved settlement),
    **when** either parent attempts to delete or edit it, **then** the rules
    reject it — unchanged from specs 003/010.

## Verification plan

- **Unit:** the solo balance form (`ABSENT_CO_PARENT` as side B); the
  provisional predicate (`resolvedBy == proposerId && acknowledgedBy == null`);
  the two-segment split of settlements/receipts by period.
- **Rules (emulator):** every branch of criteria 1, 2, 3, 9, 10 — especially
  criterion 3 (the two-parent invariant must survive this spec untouched) and
  the append-only `parentIds` pin.
- **Component:** the review queue renders unilateral items and not bilateral
  ones; Accept calls through; the balance renders one segment solo and two
  after a join.
- **Manual:** a second test account joins a household seeded with unilateral
  decisions, walks the review queue, accepts one item and counter-proposes
  another. Worth doing on the emulator rather than the pilot household —
  this is the first spec whose main flow needs a *third* real account.

## Out of scope

- **PDF / statement export of the ledger.** In a non-cooperative situation the
  real prize is a credible timestamped record for a lawyer — but `000` already
  lists this as v1-out and it deserves its own spec rather than swelling this
  one.
- A dispute mechanism for historical records. The honest answer is that a
  disputed payment gets resolved outside the app; building an in-app
  adjudication flow is a much larger product question.
- Removing a parent from a household, or "unlinking" a co-parent. The
  append-only property of `parentIds` is load-bearing for requirement 1's
  safety argument — changing it would require revisiting this spec.
- Inviting a third participant (a lawyer, a mediator, a grandparent).
- Any change to how receipts are shared or how `splitPercentA` freezes.
