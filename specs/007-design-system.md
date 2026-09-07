# 007 — Design System & Visual Language

**Status:** draft
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
| `Card` | Surface container: padding, radius, hairline border | `sunken` |
| `ListRow` | One row in a list (household members, children, later receipts/events) | `title`, `subtitle`, `trailing`, `onPress` |
| `Banner` | Inline status / info / error block | `tone` (info\|warning\|danger\|success) |
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

## Verification plan

- Automated: `npm run typecheck` + `npm test` (component snapshot/interaction
  tests for each primitive — variants, disabled, loading, error). A lint-style
  check (script or test) for criterion 1's "no raw hex / no bare fontSize".
- Contrast: computed against the token values (a small test asserting AA
  ratios), not eyeballed.
- Manual on both pilot phones: every re-skinned screen looks correct and
  legible on the mother's Android and the father's iPhone; the invite code is
  readable and copyable.

## Out of scope

- Dark mode (token structure allows it; not built in v1).
- A custom typeface or icon set (system font in v1; icon approach is its own
  later decision).
- Motion / animation system.
- Information-architecture or flow changes — this spec only changes how
  existing screens look and what they're built from.
- The custody calendar's colour semantics (004 owns those; 007 only reserves
  `parentA` / `parentB` token slots).
