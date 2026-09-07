# 003 — Receipts & Invoices

**Status:** implemented
**Depends on:** 002, 007 (built on the design-system primitives)

## User stories

- As a parent, I photograph or upload a receipt/invoice (matrícula, médico,
  deporte…) with its amount, category and date, so I have a record.
- As a parent, my receipts are private until I decide to share one with the
  other parent.
- As a parent, I see the receipts the other parent has shared, in real time.

## Requirements

- **This spec needs a native build.** It adds `expo-image-picker`,
  `expo-document-picker`, `expo-file-system`, `expo-sharing` and
  `@react-native-firebase/storage` — none OTA-deployable. Ships via spec
  006's Path B (`eas build --profile pilot` for both platforms → TestFlight
  review → Android APK reinstall).
- Upload sources: camera, photo library, or a PDF file. Max **10 MB**;
  `image/*` or `application/pdf` only.
- Fields, all required except `note` and `childId`:
  `amount` + `currency`, `category` (`tuition | medical | sports | clothing
  | other`), `expenseDate`, `note`, `childId`.
- **Money:** `amount` is an integer in the currency's smallest unit. The
  pilot currency is **CLP**, which has **no minor unit**, so `amount` = whole
  pesos. A `currencyDecimals(code)` helper (CLP → 0, USD → 2, …) drives
  input and display; other currencies are future-proofed, not offered in v1.
- **Visibility:** `private` (default) → `shared`. One-way and irreversible —
  no unshare (the other parent has already seen it), no editing a receipt's
  fields in v1 (wrong data → delete while private, re-upload).
- Lists: **"Mis recibos"** (mine, with a visibility badge) and
  **"Compartidos"** (everything `shared` by either parent), each filterable
  by category and by month, client-side.
- Files in Firebase **Storage** under the household; metadata in Firestore.
  Files are fetched for display via the **SDK download to a local cache**
  (the request carries the auth token, so Storage rules apply); images
  render inline, PDFs open through `expo-sharing`'s preview sheet on the
  downloaded local file.

## Acceptance criteria

1. **Given** a parent with a photo of a receipt, **when** they upload it and
   fill amount/category/date, **then** it appears in "Mis recibos" marked
   *Privado*, and the other parent's `receipts` listener and Storage read
   are both denied for it (security rules, not just UI).
2. **Given** a private receipt of mine, **when** I tap "Compartir", **then**
   it appears in the other parent's "Compartidos" list without them
   refreshing.
3. **Given** a shared receipt, **when** either parent opens it, **then** the
   image renders full-size (or the PDF opens) with its metadata, after the
   file is downloaded through the SDK.
4. **Given** an upload with a missing required field, or a file > 10 MB or of
   a disallowed type, **then** submission is blocked with a specific inline
   error before anything is uploaded.
5. **Given** an upload interrupted by connectivity loss, **then** no receipt
   metadata appears in any list — the Firestore document is written only
   after the Storage upload fully succeeds (a failed doc-write leaves only an
   invisible orphan file).
6. **Storage rules:** a receipt file is readable only by its uploader while
   `private`, and by both household parents once `shared`; never by anyone
   outside the household or unauthenticated.
7. **Given** a shared receipt, **when** its uploader tries to un-share, edit
   a field, or delete it, **then** the security rules reject the write.

## Data model

```
households/{hid}/receipts/{receiptId}
  uploaderId: string (uid)
  storagePath: string            // households/{hid}/receipts/{uploaderId}/{receiptId}.{ext}
  fileType: 'image' | 'pdf'
  amount: number                 // integer, smallest unit of `currency`
  currency: string               // ISO 4217; pilot default 'CLP'
  category: 'tuition' | 'medical' | 'sports' | 'clothing' | 'other'
  expenseDate: string            // yyyy-mm-dd
  note: string | null
  childId: string | null
  visibility: 'private' | 'shared'
  sharedAt: timestamp | null
  createdAt: timestamp
```

Storage object: `households/{hid}/receipts/{uploaderId}/{receiptId}.{ext}` —
the `uploaderId` segment lets the write rule and "uploader always reads own
file" work without a Firestore lookup.

## Implementation notes

**Upload sequence (`src/data/receiptsRepository.ts`):**
1. Generate `receiptId` client-side (`doc(collection(...)).id`).
2. `storage().ref(storagePath).putFile(localUri)` — **upload the file first**.
3. `setDoc(doc(receipts, receiptId), { …meta, uploaderId, storagePath,
   fileType, visibility: 'private', sharedAt: null, createdAt })`.

A failure before step 3 leaves nothing in any list (criterion 5). A failure
at step 3 leaves an orphan Storage object — invisible (lists come from
Firestore), costs ~nothing; not worth a cleanup job for the pilot.

**Display:** `downloadReceiptFile(storagePath)` →
`storage().ref(storagePath).writeToFile(<cacheDir>/receipts/<hash>.<ext>)`
once, cached; returns the `file://` uri. Images → `<Image>`; PDFs →
`Sharing.shareAsync(localUri)`.

**Firestore rules (`households/{hid}/receipts/{id}`):**

- `read`: member && (`uploaderId == uid()` || `visibility == 'shared'`). The
  client scopes its queries (`where uploaderId ==` / `where visibility ==
  'shared'`), so the rule is satisfiable.
- `create`: member && `uploaderId == uid()` && `visibility == 'private'` &&
  `sharedAt == null` && `amount` is a non-negative int && valid `category` /
  `fileType` && `storagePath` / `currency` / `expenseDate` are strings.
- `update`: member && `uploaderId == uid()` && `resource.visibility ==
  'private'` && `after.visibility == 'shared'` && `sharedAt != null` &&
  `diff().affectedKeys().hasOnly(['visibility','sharedAt'])` — the *only*
  legal update (criterion 7).
- `delete`: member && `uploaderId == uid()` && `visibility == 'private'`.

**Storage rules (`storage.rules` — new file):**

```
match /households/{hid}/receipts/{uploaderId}/{receiptId} {
  function member() {
    return request.auth != null
      && request.auth.uid in
         firestore.get(/databases/(default)/documents/households/$(hid)).data.parentIds;
  }
  function receipt() {
    return firestore.get(
      /databases/(default)/documents/households/$(hid)/receipts/$(receiptId)).data;
  }
  allow read: if member()
    && (request.auth.uid == uploaderId || receipt().visibility == 'shared');
  allow write: if member()
    && request.auth.uid == uploaderId
    && request.resource.size < 10 * 1024 * 1024
    && request.resource.contentType.matches('image/.*|application/pdf');
  allow delete: if member() && request.auth.uid == uploaderId;
}
```

**Query strategy** — two scoped listeners (`where uploaderId == uid`,
`where visibility == 'shared'`), merged and deduped by id; category/month
filtering in memory. No composite indexes.

**Store** (`src/store/receiptsStore.ts`) — `start(hid, uid)` / `stop`,
`receipts`, `upload`, `share`, `remove`, plus upload progress + error state.

**UI** — a **fourth bottom tab "Recibos"** (Calendario | Eventos | Recibos |
Hogar).

- `ReceiptsScreen` — segmented "Mis recibos" / "Compartidos", category +
  month filter chips, list, `＋ Agregar recibo`.
- `ReceiptUpload` — source picker (cámara / galería / archivo), then the
  metadata form; validation extracted to `buildReceiptInput`.
- `ReceiptDetail` — the file (image inline / "Abrir PDF"), metadata,
  "Compartir con la otra persona" (while private, with a confirm), "Eliminar"
  (while private).

**Native config** — `expo-image-picker` plugin with camera/photo
usage-description strings; `firebase.json` gains the `storage` emulator; the
`test:rules` script runs `--only firestore,auth,storage`.

## Verification plan

- **Unit** (`src/receipts/__tests__/`): `buildReceiptInput` (missing fields,
  bad amount, oversize/wrong-type file), `currencyDecimals` + amount
  format/parse, list merge/dedupe + category/month filter.
- **Store**: upload happy path (file then doc), upload failure leaves no doc,
  share flip, in-flight guard.
- **Firestore rules**: criterion 1 (co-parent denied a private receipt),
  criterion 7 (no un-share / edit / delete-after-share), create field checks.
- **Storage rules** (new emulator): uploader reads own private file;
  co-parent denied while private, allowed once shared; outsider and
  unauthenticated denied; >10 MB and non-image/PDF writes denied.
- **Manual on both pilot phones** *(after the native build)*: the mother
  uploads a real receipt photo and a PDF invoice; both stay private; she
  shares one; the father sees it in "Compartidos" and opens the file; he
  cannot see the unshared one.

## Out of scope

- Expense splitting, balances, "me debes" math.
- OCR / auto-extraction of the amount.
- Un-sharing, or editing any field after upload (v1: delete while private,
  re-upload).
- Multi-currency entry (model supports it; UI is CLP-only in v1).
- An orphan-file cleanup job.
