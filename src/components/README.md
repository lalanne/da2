# Primitives (spec 007)

Screens compose **only** these + `src/theme`. No bare `View`/`Text`/`Button`
for anything a primitive covers; no raw hex, `fontSize`, or pixel
padding/margin outside `src/theme/` and this folder.

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `Screen` | Safe-area frame, `bg`, standard page padding, keyboard avoidance | `scroll`, `center` |
| `Text` | The only text component | `variant` (`display`\|`title`\|`heading`\|`body`\|`label`\|`caption`), `color` (theme colour name), `align` |
| `Button` | Replaces RN `<Button>`; ≥ 48pt tall, pressed state, `{testID}-loading` spinner | `title`, `onPress`, `variant` (`primary`\|`secondary`\|`ghost`\|`danger`), `loading`, `disabled`, `fullWidth` |
| `TextField` | Labelled input + inline error (`{testID}-error`); iOS-safe (no `maxLength`/`letterSpacing`/`textAlign`) | `label`, `value`, `onChangeText`, `error`, `autoCapitalize` |
| `Card` | Surface container: radius, hairline border, padding | `sunken`, `flush` (no padding — for row lists) |
| `ListRow` | One list row; ≥ 52pt, pressed state when `onPress` | `title`, `subtitle`, `muted`, `leading`, `trailing`, `onPress` |
| `Banner` | Inline status block | `tone` (`info`\|`warning`\|`danger`\|`success`) |
| `CodeChip` | The invite code — large, `selectable`, on a sunken well | `code` |
| `Avatar` | Member initial in a circle, or an empty dashed slot | `name`, `empty` |
| `Emblem` | The app's only brand mark — two overlapping rings | `size` |

Contrast (AA) is asserted in `src/theme/__tests__/contrast.test.ts`; token
discipline in `src/theme/__tests__/tokenDiscipline.test.ts`.
