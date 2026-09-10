import { theme } from '..';

/** WCAG 2.1 relative-luminance contrast ratio between two sRGB hex colours. */
function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = hex
      .replace('#', '')
      .match(/../g)!
      .map((h) => {
        const c = parseInt(h, 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const c = theme.colors;

describe('theme contrast (spec 007 criterion 3)', () => {
  // Small text (body / label / caption) needs AA 4.5:1.
  it.each<[string, string, string]>([
    ['textPrimary', 'bg', c.textPrimary],
    ['textPrimary', 'surface', c.textPrimary],
    ['textSecondary', 'bg', c.textSecondary],
    ['textSecondary', 'surface', c.textSecondary],
    ['textFaint', 'bg', c.textFaint],
    ['textFaint', 'surface', c.textFaint],
  ])('%s on %s ≥ 4.5', (_fg, bgName, fg) => {
    const bg = (c as Record<string, string>)[bgName];
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each<[string, string, string]>([
    ['accentText', 'accent', c.accentText],
    ['accentText', 'accentPressed', c.accentText],
    ['accentPressed', 'accentSoft', c.accentPressed], // Banner info
    ['danger', 'dangerBg', c.danger], // Banner danger
    ['success', 'successBg', c.success],
    ['warning', 'warningBg', c.warning],
    ['danger', 'surface', c.danger], // TextField error line on a card
    ['textPrimary', 'parentASoft', c.textPrimary], // calendar day numbers (mother, pink)
    ['textPrimary', 'parentBSoft', c.textPrimary], // (father, blue)
  ])('%s on %s ≥ 4.5', (_fg, bgName, fg) => {
    const bg = (c as Record<string, string>)[bgName];
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Large text (title / display) and interactive borders: AA 3:1.
  it.each<[string, string, string]>([
    ['borderStrong', 'bg', c.borderStrong], // resting input outline
    ['accent', 'surface', c.accent], // focused input outline
    ['accent', 'bg', c.accent],
    ['parentA', 'bg', c.parentA], // custody legend swatch border (mother)
    ['parentB', 'bg', c.parentB], // (father)
  ])('%s on %s ≥ 3', (_fg, bgName, fg) => {
    const bg = (c as Record<string, string>)[bgName];
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
