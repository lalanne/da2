# 010 — Shared expense splitting

**Status:** implemented
**Depends on:** 003 (receipts — the amounts and the share flow), 004 (the
propose/approve machinery this mirrors), 007, 009 (money/date input reuse).
Built on top of 003 while 003's own pilot sign-off is still pending; nothing
here blocks that sign-off.

Moves "expense-splitting math, balances, settlement" from **out** to **in**
in `000-overview.md`'s v1 scope table, and removes the matching line from
spec 003's Out of scope.

## User stories

- As a parent, our divorce agreement splits costs by a percentage that
  differs by expense type. I set that table once; changing it later needs
  the other parent's approval.
- As a parent, when a receipt is shared I see exactly what each of us owes on
  it — computed from the agreed table, not typed by hand.
- As a parent, I see a running balance of who owes whom across every shared
  receipt, and I can record a payment to settle up (the other parent
  confirms it).

## Requirements

### The split table

- **One household table**, agreed by both parents:
  - `defaultPercentA` — `parentIds[0]`'s share of any expense, `0…100` (whole
    numbers). `parentIds[1]`'s share is `100 − defaultPercentA`.
  - `overrides` — `{ [tag]: percentA }` for any of the fixed receipt tags
    (`tuition | medical | sports | clothing | other`). A tag with no entry
    uses the default.
- **Agreed via propose → approve**, exactly like custody (spec 004):
  - The active table is **the newest `approved` split proposal** — there is
    no separate "current" document, same as custody patterns.
  - One parent proposes a table; the **other** approves or rejects; the
    proposer can never approve their own (rules). The proposer may cancel a
    still-pending proposal.
  - On approval it becomes active **going forward**. Receipts already shared
    keep the split they were frozen with.
  - **No active table** (household has never approved one) → sharing a
    receipt is blocked with "define primero el reparto de gastos", and the
    balance card shows the same prompt.
- v1 has **no caps, exclusions, thresholds, or pre-approval rules** — the
  pilot's agreement has none. (Confirmed 2026-09-10.)

### Per-receipt split (frozen at share time)

- When a receipt's `visibility` flips `private → shared` (spec 003's
  one-way update), the client resolves the split and writes
  `splitPercentA` onto the receipt in the **same** update:
  - **no tags** → `defaultPercentA`
  - **one tag** → that tag's override, else the default
  - **≥ 2 tags whose rules differ** → the sharer is shown a one-tap chooser
    ("¿Qué regla aplica? Médico 50/50 · Deporte 70/30") and picks one; if
    all the tags resolve to the same percentage, no prompt.
- `splitPercentA` is **frozen** — a later table change never rewrites it.
- **Rounding:** `receiptShares(amount, percentA)` returns two integers in the
  currency's minor unit that **sum exactly to `amount`**. `parentIds[0]` gets
  `round(amount × percentA / 100)`; `parentIds[1]` gets the remainder.
  Deterministic — same inputs, same output.
- **Assumption:** the **uploader paid** the full amount (`uploaderId`).
  An explicit `paidBy` is out of scope for v1.

### Balance

- **Only `shared` receipts** count. Private receipts never affect the
  balance.
- For each shared receipt: the uploader paid `amount`; the **other** parent
  owes their share (`amount − uploader's share`).
- `computeBalance(sharedReceipts, confirmedSettlements, parentIds)` →
  a signed net in **CLP** (v1 is single-currency; the model carries
  `currency` for later). Rendered as
  "‹A› le debe $N a ‹B›" or "Están a mano".

### Settlements (recording a payment)

- Either parent records a payment: `payerUid`, `payeeUid`, `amount` (> 0,
  CLP), optional `note`.
- It is created **`pending`**; the **other** parent (not the recorder)
  confirms or rejects it. Only **`confirmed`** settlements move the balance.
  The recorder may cancel a still-pending one.
- Same trust rationale as custody: anything that changes what both parents
  see is never unilateral.

## Data model

```
households/{hid}/splitProposals/{proposalId}
  proposerId: string (uid)
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: timestamp
  resolvedAt: timestamp | null
  resolvedBy: string (uid) | null
  defaultPercentA: int                       // 0…100
  overrides: map<string,int>                 // keys ⊂ the 5 receipt tags; values 0…100

households/{hid}/settlements/{settlementId}
  recordedBy: string (uid)
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  payerUid: string (uid)
  payeeUid: string (uid)                     // the two are the household's parentIds
  amount: int                                // minor unit, > 0
  currency: string                           // 'CLP' in v1
  note: string | null
  createdAt: timestamp
  resolvedAt: timestamp | null
  resolvedBy: string (uid) | null

households/{hid}/receipts/{receiptId}         // spec 003 doc — one field added
  … +
  splitPercentA: int | null                  // parentIds[0]'s % for THIS receipt,
                                             // written only in the private→shared update
```

## Implementation notes

- **`src/split/`** (pure, mirrors `src/custody/` · `src/receipts/`):
  - `activeSplit(proposals) → SplitTable | null` — newest `approved`.
  - `resolveSplitPercent(table, tags, pick?) → { percentA, needsPick, choices }`.
  - `receiptShares(amount, percentA) → { a, b }` — exact-sum rounding.
  - `computeBalance(receipts, settlements, parentIds) → { netAOwesB, label }`.
- **`src/store/splitStore.ts`** — `start(hid, uid)` / `stop`, live listeners
  on `splitProposals` + `settlements`, actions `proposeSplit`,
  `resolveSplitProposal`, `cancelSplitProposal`, `recordSettlement`,
  `confirmSettlement`, `rejectSettlement`, `cancelSettlement`; the
  `isSubmitting` / `actionError` guards every other store uses.
- **`receiptsStore.share`** gains a `splitPercentA` argument and writes it in
  the same `updateDoc` as `visibility`/`sharedAt`.
- **UI** (Recibos tab — no new tab, view-state within it). Chosen designs
  (canvas, 2026-09-10): balance card = **"cifra"**, split editor = **"pasos"**.
  - The **"Compartidos"** segment gets a **balance card** on top — the net
    figure large ("Javiera te debe $30.000" / "Están a mano"), with
    `Registrar pago` and `Ver detalle` buttons. Parent colours: `parentA`
    for `parentIds[0]`, `parentB` for `parentIds[1]`.
  - `BalanceDetail` — one row per shared receipt (amount · who paid · each
    share), the settlements list with pending/confirm affordances, and
    `Registrar pago` (amount via `TextField` + `parseAmount`, direction
    toggle, optional note).
  - `SplitTableView` — the active table as read-only rows (default % + a row
    per tag, each with a small `parentA`/`parentB` bar). `Proponer un cambio`
    → `SplitProposeForm`: **`+` / `−` steppers in 5-point steps** on
    `parentIds[0]`'s %, the other's derived; a row per rule, `Añadir regla`
    to add a tag override. **No slider — no native module.** A pending
    proposal shows the approve/reject banner for the non-proposer, mirroring
    `PatternSetup` / `ProposeOverride`.
  - `ReceiptDetail` (shared) — a "Reparto" row: "Tú $X (40%) · ‹other› $Y".
  - `ReceiptDetail` share action — the multi-rule chooser when needed.
- **Firestore rules** (`households/{hid}/splitProposals`, `/settlements`):
  - `splitProposals`: `create` — member && `proposerId == uid` &&
    `status == 'pending'` && `resolvedBy == null` && `defaultPercentA is
    number` in `0…100` && `overrides is map` (its values are validated
    client-side in `buildSplitProposalInput`, same rigor as custody's
    `cycle`). Note: `is number` not `is int` — the client SDK writes numbers
    as doubles. `update` — only the **non-proposer** flips
    `pending → approved|rejected` (`resolvedBy == uid`, affected keys
    ⊆ `status,resolvedAt,resolvedBy`); the **proposer** cancels
    (`pending → cancelled`). `delete` — never. (Copy custody's
    `resolveProposal` / `cancelProposal`.)
  - `settlements`: `create` — member && `recordedBy == uid` &&
    `status == 'pending'` && `payerUid` and `payeeUid` are the two
    `parentIds` && `amount` is an int `> 0` && `currency == 'CLP'`.
    `update` — the **non-recorder** flips `pending → confirmed|rejected`;
    the recorder cancels `pending → cancelled`; nothing else mutable.
    `delete` — never.
  - `receipts` one-way update rule: extend `affectedKeys().hasOnly([...])` to
    include `splitPercentA`, and require it be a number `0…100`.

## Acceptance criteria

1. **Given** a household with no approved split table, **when** a parent
   tries to share a receipt, **then** it is blocked with "define primero el
   reparto de gastos"; the balance card shows the same prompt.
2. **Given** a proposed split table, **when** the other parent approves it,
   **then** it becomes the active table; **when** the *proposer* tries to
   approve it, **then** the rules reject the write (as spec 004 criterion 5).
3. **Given** an active table, **when** a parent shares a receipt, **then**
   `splitPercentA` is written on the receipt in the same update, resolved
   from the receipt's tags; **and** a later approved table change leaves that
   receipt's `splitPercentA` untouched.
4. **Given** a receipt whose tags map to two different percentages, **when**
   the parent shares it, **then** they must pick which rule applies before
   the share completes; **given** tags that all resolve to the same
   percentage (or none), **then** no prompt appears.
5. **Given** any amount and percentage, **then** `receiptShares` returns two
   integers that sum exactly to the amount, and identical inputs always give
   the identical split.
6. **Given** shared receipts paid by both parents, **then** the balance is
   Σ(the non-payer's share) netted by direction and reduced by confirmed
   settlements, shown as "‹A› le debe $N a ‹B›" or "Están a mano".
7. **Given** a recorded payment, **then** it is `pending` and does not move
   the balance; **when** the *other* parent confirms it, **then** the
   balance updates; **when** the recorder confirms their own, **then** the
   rules reject it; the recorder can cancel it while pending; the other can
   reject it.
8. **Given** a private receipt, **then** it never appears in the balance
   math.
9. **Firestore rules:** a non-member reads/writes nothing under
   `splitProposals` or `settlements`; a settlement or proposal can only be
   resolved by the parent who did **not** create it; the receipt one-way
   update accepts `splitPercentA` (int `0…100`) and no other new key.

## Verification plan

- **Unit** (`src/split/__tests__/`): `activeSplit` (picks newest approved,
  ignores pending/rejected), `resolveSplitPercent` (no tags → default, one
  tag → override, multi-rule → `needsPick` + choices, uniform multi-tag → no
  pick), `receiptShares` (exact sum, 0 % / 100 %, odd amounts like $9 991 at
  33 %), `computeBalance` (each direction, confirmed vs pending settlements,
  "a mano").
- **Store**: propose/approve/reject/cancel a table; `share` freezes
  `splitPercentA`; record/confirm/reject/cancel a settlement; in-flight
  guard; `actionError` surfaced.
- **Firestore rules**: proposal create field checks + non-proposer-only
  resolve (mirror `custody.rules.test.ts`); settlement create + confirm by
  non-recorder only; receipt one-way update now allows `splitPercentA` and
  still rejects any other field.
- **Manual on both pilot phones**: propose 50/50 with a `medical` override
  of 50/50 and `sports` 70/30; the mother approves; the father shares a
  medical receipt he paid → both phones show "$X / $Y" and "Javiera le debe
  $X a Christian"; the mother records paying that amount; the father
  confirms; the balance reads "Están a mano".

## Verification results

Implemented 2026-09-10. JS + Firestore-rules only — no native change; ships
OTA + `firebase deploy --only firestore:rules`.

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1 no table blocks sharing | ✅ | `ReceiptDetail` — the share button reads "Definir reparto" and routes to the table when `activeSplit` is null; `BalanceCard` shows the prompt (`split.smoke.test.tsx`). |
| 2 propose → approve, proposer can't self-approve | ✅ | `firebase/tests/split.rules.test.ts` — non-proposer-only resolve; `splitStore.test.ts` forwards. |
| 3 split frozen on the receipt | ✅ | `receiptsRepository.shareReceipt` writes `splitPercentA` in the same `updateDoc`; `receipts.rules.test.ts` — the one-way update accepts exactly `visibility,sharedAt,splitPercentA`. `computeBalance` reads the frozen value, never the live table. |
| 4 multi-rule pick | ✅ | `resolveSplitPercent` unit tests (no tags / one / uniform / conflicting + `pick`); `ReceiptDetail` shows the chooser chips. |
| 5 exact-sum rounding, deterministic | ✅ | `receiptShares` unit test — `a+b == amount` across odd amounts / 0 / 100 %. |
| 6 balance math | ✅ | `computeBalance` unit test — both directions, confirmed vs pending settlements, private receipts ignored. |
| 7 settlement pending → confirmed by the other only | ✅ | `split.rules.test.ts` — non-recorder-only confirm/reject, recorder-only cancel. |
| 8 private receipts never in the balance | ✅ | `computeBalance` filters `visibility === 'shared' && splitPercentA != null`. |
| 9 rules: non-member denied, resolve-by-non-creator only | ✅ | `split.rules.test.ts` (6 cases) + the extended `receipts.rules.test.ts`. |

213 unit + 62 rules tests + typecheck green. Rule note: `splitPercentA` /
`defaultPercentA` are validated `is number` (not `is int`) — the client SDK
writes numbers as doubles.

Manual on both pilot phones — **pending** (rides the same session as the
spec 003 walkthrough).

## Out of scope

- Caps, exclusions, minimum thresholds, "needs pre-approval over $X".
- An explicit payer distinct from the uploader.
- Multi-currency balances (the model keeps `currency`; v1 is CLP only).
- Correcting a receipt's frozen `splitPercentA` after it is shared — fix it
  with a manual settlement adjustment (a payment for the difference, with a
  note).
- Reminders / notifications about money owed (a spec 008 concern later).
- Statements / PDF export of the ledger.
- Splits other than between the two household parents.
