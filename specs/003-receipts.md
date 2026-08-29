# 003 — Receipts & Invoices

**Status:** draft
**Depends on:** 002

## User stories

- As a parent, I photograph or upload a receipt/invoice (tuition, medical,
  sports…) with its amount, category, and date, so I have a record.
- As a parent, my receipts are private until I decide to share one with my
  co-parent.
- As a parent, I see the receipts my co-parent has shared with me.

## Requirements

- Upload sources: camera, photo library, or file (PDF). Max 10 MB.
- Structured fields, all required except notes:
  amount + currency, category (tuition | medical | sports | clothing |
  other), date of expense, optional note, optional child link.
- Visibility per receipt: `private` (default) → `shared`. Sharing is one-way
  and irreversible in v1 (no unshare — the co-parent has already seen it).
- Lists: "My receipts" (all mine, with visibility badge) and "Shared"
  (everything shared by either parent), filterable by category and month.
- Files stored in Firebase Storage under the household; metadata in
  Firestore.

## Acceptance criteria

1. **Given** a parent with a photo of a receipt, **when** they upload it and
   fill amount/category/date, **then** it appears in "My receipts" marked
   Private, and the co-parent cannot see it (verified by security rules, not
   just UI).
2. **Given** a private receipt of mine, **when** I tap "Share", **then** it
   appears in the co-parent's "Shared" list without them refreshing
   (real-time listener).
3. **Given** a shared receipt, **when** either parent opens it, **then** the
   full-size document renders (image or PDF) with its metadata.
4. **Given** an upload with a missing required field or a file > 10 MB,
   **then** submission is blocked with a specific inline error.
5. **Given** an upload interrupted by connectivity loss, **then** no orphan
   metadata appears in any list (file and document are created atomically or
   not at all).
6. Storage security rules: a receipt file is readable only by the uploader
   while private, and by both household parents once shared. Never by anyone
   outside the household.

## Data model

```
households/{hid}/receipts/{receiptId}
  uploaderId: string (uid)
  fileUrl: string               // Storage path
  fileType: 'image' | 'pdf'
  amount: number                // minor units (cents)
  currency: string              // ISO 4217
  category: 'tuition' | 'medical' | 'sports' | 'clothing' | 'other'
  expenseDate: date
  note: string | null
  childId: string | null
  visibility: 'private' | 'shared'
  sharedAt: timestamp | null
  createdAt: timestamp
```

## Out of scope

- Expense splitting, balances, "you owe me" math.
- OCR / auto-extraction of amounts.
- Unsharing or editing after share (v1: delete allowed only while private).
