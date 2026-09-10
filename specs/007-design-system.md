# 007 — Design System & Visual Language

**Status:** verified
**Depends on:** 002 (needs real screens to re-skin)
**Build order:** implemented **before** 003 — specs 003–005 build their UI from
these primitives. (Numbered 007 only to avoid renumbering 003–006; see the
build-order note in `specs/README.md`.)

## Why

Specs 001–002 spent their effort on auth, security rules, and the join state
machine. The screens use raw React Native components — default `<Button>`,
unstyled `<Text>`, ad-hoc hex colours and pixel values, no type scale. Before
the calendar (004) and its many custom views are built, the app needs a small
in-house design system: a tokens module plus a set of themed primitives, with
the existing screens re-skinned onto it.

Not a redesign of information architecture or flows — only how things look and
the components they're built from.

## Visual language

- **Tone: calm, neutral, trustworthy.** Two co-parents who may be in conflict;
  the app is neutral ground. Not playful, not a cheerful "family app", not
  cold enterprise. Restraint over personality.
- **Colour:** one muted accent (slate-blue / desaturated teal family), a
  warm-neutral grey ramp for text/surfaces/borders, and semantic colours
  (`danger`, `warning`, `success`) used sparingly. Two reserved
  parent-identity colours for the custody calendar (defined here as token
  slots, their calendar semantics live in 004).
- **Typography:** the platform system font (SF Pro / Roboto) — no bundled
  typeface in v1 (keeps builds simple; matches "no i18n library yet"). A fixed
  scale: `display`, `title`, `heading`, `body`, `label`, `caption`.
- **Spacing:** 4 px base unit; steps `xs 4 / sm 8 / md 16 / lg 24 / xl 32 /
  xxl 48`.
- **Shape:** radius `sm 8 / md 12 / lg 20`; hairline borders, no heavy shadows.
- **Layout:** single column, mobile-first, generous padding, comfortable line
  length. Touch targets ≥ 44 pt.
- **Light mode only in v1.** Tokens are structured so a dark theme can be
  added later without touching call sites.

## Tokens — `src/theme/`

A static module (light theme only), imported like `src/i18n/strings.ts`:

```
theme.colors    bg, surface, surfaceSunken, textPrimary, textSecondary,
                textFaint, border, accent, accentText, danger, dangerBg,
                warning, success, parentA, parentB
theme.spacing   xs sm md lg xl xxl
theme.radius    sm md lg
theme.type      display title heading body label caption
                (each: fontSize, lineHeight, fontWeight, letterSpacing?)
```

No raw hex, no raw pixel spacing, no bare `fontSize` anywhere else in the app.

## Primitives — `src/components/`

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Screen` | Safe-area frame, background, consistent page padding, optional scroll + keyboard avoidance | `scroll`, `center` |
| `Text` | The only text component | `variant` (display…caption), `color`, `align` |
| `Button` | Replaces RN `<Button>` | `variant` (primary\|secondary\|ghost\|danger), `loading`, `disabled`, `fullWidth`, `onPress` |
| `TextField` | Labelled input + error line; carries the iOS-safe config (no `maxLength`/`letterSpacing`/`textAlign` traps from spec 002) | `label`, `value`, `onChangeText`, `error`, `autoCapitalize` |
| `DateField` | Labelled field that expands an inline Monday-first month grid — no keyboard (spec 009). Selected day filled `accent`, today ringed | `label`, `value` (`yyyy-mm-dd \| null`), `onChange`, `optional`, `min`/`max`, `timezone` |
| `TimeField` | Labelled field opening a bottom-sheet time list at `stepMinutes` — no keyboard (spec 009) | `label`, `value` (`HH:mm \| null`), `onChange`, `optional`, `stepMinutes` |
| `Card` | Surface container: padding, radius, hairline border | `sunken` |
| `ListRow` | One row in a list (household members, children, later receipts/events) | `title`, `subtitle`, `trailing`, `onPress` |
| `Banner` | Inline status / info / error block | `tone` (info\|warning\|danger\|success) |
| `Chip` | Small pill for **multi-select and static display** (the receipt-upload tag / child pickers; tags shown on the detail screen). Interactive: unselected = `surface` + `border`, selected = `accentSoft` fill + `accent` border + `accent` text. Static (no `onPress`) = `accentSoft` + `accent` text, no border. ≥ 44 pt target when interactive | `label`, `selected`, `onPress?` |
| `FilterTabs` | **Single-select** filter row — scrollable underline tabs on a hairline baseline (the receipt list's tag and month filters). Selected = `accent` text + 2 pt `accent` underline; rest `textSecondary`. Touch target extended with `hitSlop`. Generic over a primitive value type | `options` (`{value, label}[]`), `value`, `onChange` |
| `CodeChip` | The invite code: large, `selectable`, monospace-ish, copy affordance | `code` |

Primitives compose only tokens + other primitives. Screens compose only
primitives (no bare `View`/`Text`/`Button` for anything a primitive covers).

## Acceptance criteria

1. **Given** the codebase, **when** grep'd, **then** no file outside
   `src/theme/` contains a raw hex colour, and no file outside
   `src/theme/` + `src/components/` sets a bare `fontSize` or hard-coded pixel
   padding/margin — all come from `theme`.
2. **Given** the screens from specs 001–002 (Welcome, create-or-join, create
   household, join, household panel, main), **when** re-skinned, **then** they
   render only through the primitives, `npm test` and `npm run typecheck`
   stay green, and every user-facing string still comes from `src/i18n`.
3. **Given** any text/background pair in the app, **then** it meets WCAG AA
   contrast (≥ 4.5:1 body, ≥ 3:1 for `title`/`display` and UI borders).
4. **Given** any `Button`, `ListRow`, or other tappable, **then** its hit area
   is ≥ 44 × 44 pt and it shows a visible pressed state.
5. **Given** a new screen in a later spec, **then** it can be built without
   adding a raw color/spacing value — the token set and primitives are
   sufficient (revisit the spec if not).
6. **Given** the change set, **then** it adds no native dependency (no icon
   font, no typeface file, no UI kit) and ships to the pilot via `eas update`
   (Path A).
7. **Given** this spec, **then** it links the approved `design` canvas
   Artifact that captures the visual direction.

## Visual direction (draft)

Canvas: <https://claude.ai/code/artifact/9ea080f1-395e-49a9-9a86-d28916603d30>
(working files in `design/canvas/`). Seven artboards: the auth + household
flow re-skinned (bienvenida, configura tu hogar, crear un hogar, unirme con
un código, hogar/pantalla principal), a calendar reference for spec 004, and
the token + primitive sheet.

Palette resolved on the canvas — carry these into `src/theme/`:

| token | value | | token | value |
|---|---|---|---|---|
| `bg` | `#FBFAF8` | | `accent` | `#46617E` |
| `surface` | `#FFFFFF` | | `accentSoft` | `#ECF1F5` |
| `surfaceSunken` | `#F1EFEC` | | `accentPressed` | `#33485F` |
| `border` | `#E4E0DA` | | `danger` | `#9E4430` |
| `borderStrong` | `#8C887F` | | `dangerBg` | `#F6EAE6` |
| `textFaint` | `#767268` | | `success` | `#3F6B52` |
| `textSecondary` | `#6C6960` | | `warning` | `#785A24` |
| `textPrimary` | `#2A2926` | | `parentA` | `#46617E` |
| | | | `parentB` | `#A9764F` |

`textFaint`, `warning` and `borderStrong` differ from the first canvas draft —
darkened so every text pair and interactive border passes WCAG AA
(`src/theme/__tests__/contrast.test.ts`). `border` stays light: it's a
decorative card/divider edge, never the sole indicator of a control.

Type: system font, `display 30/36·600`, `title 24/30·600`,
`heading 18/24·600`, `body 16/24·400`, `label 14/18·600`,
`caption 13/18·400` (secondary colour). Spacing `4·8·16·24·32·48`; radius
`8·12·20`; buttons 48 pt tall.

## Verification plan

- Automated: `npm run typecheck` + `npm test` (component snapshot/interaction
  tests for each primitive — variants, disabled, loading, error). A lint-style
  check (script or test) for criterion 1's "no raw hex / no bare fontSize".
- Contrast: computed against the token values (a small test asserting AA
  ratios), not eyeballed.
- Manual on both pilot phones: every re-skinned screen looks correct and
  legible on the mother's Android and the father's iPhone; the invite code is
  readable and copyable.

## Verification results

Verified 2026-09-06.

| Criterion | Result | Evidence |
|-----------|--------|----------|
| 1 token discipline | ✅ | `src/theme/__tests__/tokenDiscipline.test.ts` — no raw hex outside `src/theme/`, no bare `fontSize` / pixel padding-margin outside `src/theme/` + `src/components/`. |
| 2 screens re-skinned, green | ✅ | Welcome, onboarding, create, join, household panel, main + `App.tsx` render only through the primitives; 79 unit + 26 rules tests + typecheck green; all copy still from `src/i18n`. |
| 3 AA contrast | ✅ | `src/theme/__tests__/contrast.test.ts` — every text pair ≥ 4.5:1, interactive borders ≥ 3:1. `textFaint`/`warning` darkened and `borderStrong` added to pass. |
| 4 touch targets | ✅ | `Button` ≥ 48pt, `ListRow` ≥ 52pt, `TextField` ≥ 50pt; pressed states on `Button`/`ListRow` (primitives test). |
| 5 sufficient for later screens | ✅ | The calendar reference artboard and the receipts/events layouts map onto the existing tokens + primitives without new values. |
| 6 no native dependency | ✅ | `package.json` unchanged; shipped to the pilot via `eas update` (Path A). |
| 7 canvas linked | ✅ | Canvas above; working files in `design/canvas/`. |

Manual: the re-skinned app was checked on both pilot phones (mother's Android,
father's iPhone) — screens are legible and consistent, the invite code is
still long-press-copyable.

## Amendments

**2026-09-08 — `Chip` primitive.** Added for spec 003's receipt tag rows,
replacing the ad-hoc `FilterChip`/segment styling `ReceiptsScreen` had rolled
locally. Tokens-only, no native dependency (criterion 6 still holds).

**2026-09-09 — `FilterTabs` primitive.** The receipt list's tag/month filter
rows moved from `Chip` pills to scrollable **underline tabs** (calmer, less
boxy — a pilot preference). `Chip` stays for multi-select (upload) and static
tag display (detail). Tokens-only, ships OTA. Both primitives get a cell on
the token + primitive artboard on the next canvas re-seed.

**Spec 009 — `DateField` + `TimeField` primitives.** `DateField` = a tappable
field that expands an inline month grid (selected day filled `accent`, today
ringed); `TimeField` = a tappable field opening a bottom-sheet 15-minute list.
Both pure-JS (reuse `src/custody/dates.ts`), no native dependency
(criterion 6 holds). They replace the free-text `AAAA-MM-DD` / `HH:MM` inputs
across specs 002–005 — see `009-date-time-input.md`.

## Out of scope

- Dark mode (token structure allows it; not built in v1).
- A custom typeface or icon set (system font in v1; icon approach is its own
  later decision).
- Motion / animation system.
- Information-architecture or flow changes — this spec only changes how
  existing screens look and what they're built from.
- The custody calendar's colour semantics (004 owns those; 007 only reserves
  `parentA` / `parentB` token slots).
