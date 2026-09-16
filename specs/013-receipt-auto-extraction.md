# 013 — Receipt auto-extraction (amount + date)

**Status:** draft
**Depends on:** 003 (receipts — this extends the upload form only)

> **This is a v2 feature.** `specs/000-overview.md`'s v1 scope table
> already lists "OCR of receipts" under **Out (later)**. This spec is not
> part of the current pilot build order (001 → 002 → 007 → 004 → 005 → 003
> → 008, with 006/009/010/011/012 cross-cutting) and is not scheduled —
> it's written now so the shape is ready to pick up once v1 is verified and
> the pilot is ready to grow. Do not implement against this spec without an
> explicit go-ahead to start v2 work.

## Problem

Entering a receipt's amount and date by hand is the main friction in the
upload flow (spec 003). Most receipts are a photo of a physical boleta —
the data is already on the image.

## User stories

- As a parent photographing a receipt, I see the amount and date already
  filled in when I reach the form, so I usually only need to confirm and
  tap save.
- As a parent, I always see what was detected before it's saved, and can
  correct it — nothing is written from a guess without my review.
- As a parent, if detection fails or is wrong, the form works exactly like
  it does today — typing it in myself is never blocked or made harder.

## Requirements

- **Trigger point:** extraction runs client-side, right after a photo/file
  is picked in `ReceiptUpload` — **before** the Storage upload or Firestore
  write that spec 003 already does. It only ever pre-fills the same
  `amount` / `expenseDate` fields the form already has; the rest of spec
  003's upload sequence (upload file, then write doc) is **unchanged**.
- **Never auto-submit.** Detected values populate the form fields as
  editable, normal input — visually marked as detected (e.g. a small
  "detectado, revisa" hint) so the parent knows to glance-check it, same
  spirit as the rest of the app's trust model (co-parents are adversarial;
  a wrong number silently landing in a shared expense split is a real
  failure mode). The parent still presses the existing submit button.
- **Fails open.** If extraction errors, times out, or returns nothing
  usable, the form behaves exactly as spec 003 ships it today — blank
  fields, manual entry, no error banner, no blocked submission. Detection
  is a convenience, never a dependency.
- **Images only, v2.0.** Runs for camera/gallery photos; PDFs (already
  supported by spec 003 for scanned invoices) are left to manual entry —
  revisit once image extraction is proven.
- **No new persisted fields required.** Extraction only prefills existing
  `NewReceiptInput` fields before submission; the saved `Receipt` doc looks
  identical to one entered by hand. (Optional, decide at implementation:
  a local-only `amountSource: 'manual' | 'auto' | 'auto-edited'` UI flag for
  the confirm-hint copy — not necessarily persisted.)

## Open decisions (resolve before implementation)

1. **Extraction provider — OCR vs. vision LLM.** Chilean boletas vary
   enough in layout that plain OCR (Google Cloud Vision text detection) +
   regex parsing will likely misfire more often than a vision-capable LLM
   given the image directly and asked for structured JSON. The LLM route
   costs more per call and adds an external API dependency; OCR keeps
   everything inside the existing GCP project. Needs a call before
   building.
2. **Privacy of sending the image off-device.** A receipt can carry
   personal/financial information. Whichever provider is picked, this spec
   needs an explicit line on what leaves the device, to what vendor, and
   whether that needs disclosure to the pilot household. This isn't
   covered by any existing "Locked-in stack decision" in `CLAUDE.md` — it's
   a new one.
3. **Where the call happens.** A Firebase Cloud Function (callable HTTPS)
   keeps the provider's API key server-side, never shipped in the app
   bundle — the client sends the picked image, gets back
   `{ amount, currency, expenseDate, confidence } | null`. This keeps
   "no custom API server" intact (Cloud Functions is Firebase infra) but
   is the first time this app calls out from a Function to anything
   beyond Firebase itself — worth confirming that's acceptable.

## Acceptance criteria

1. **Given** a parent picks a receipt photo, **when** extraction succeeds,
   **then** the amount and date fields are pre-filled, editable, and
   visually marked as detected — submission still requires the parent's
   explicit tap.
2. **Given** extraction returns low confidence or nothing usable, **then**
   the fields stay blank and the form is indistinguishable from spec 003's
   current behaviour.
3. **Given** extraction errors, times out, or the device is offline,
   **then** the form still works for fully manual entry with no error
   shown to the parent.
4. **Given** a parent edits a pre-filled value before saving, **then** the
   edited value is what's saved — never the originally detected one.
5. **Given** the saved `Receipt` doc, **then** its shape is identical
   whether the amount/date came from detection or manual entry (no schema
   drift from spec 003).
6. **Given** a PDF invoice, **then** no extraction is attempted — manual
   entry only, exactly as today.

## Verification plan

- **Unit:** the extraction-result → form-prefill mapping (success, low
  confidence, null, malformed response all degrade to spec 003's existing
  blank-field behaviour).
- **Manual, both pilot phones:** photograph a handful of real boletas
  (thermal paper, varied lighting/angle) and confirm the hit rate is
  actually useful before treating this as done — if accuracy is poor
  enough that parents stop trusting the prefill, the feature isn't worth
  shipping as designed.

## Out of scope

- PDF extraction (revisit after image extraction is proven).
- Extracting anything beyond amount + date (merchant name, tags, line
  items) — a possible later extension, not this spec.
- Any change to spec 003's data model, Storage/Firestore rules, or upload
  sequence — this is additive UI-only prefill.
- Retrying/improving a low-confidence result automatically (e.g. a second
  provider call) — one attempt, then fail open.
