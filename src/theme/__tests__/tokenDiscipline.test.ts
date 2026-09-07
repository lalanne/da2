import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Spec 007 criterion 1: no raw hex colour outside `src/theme/`, and no bare
 * `fontSize` / hard-coded pixel padding-margin outside `src/theme/` +
 * `src/components/`.
 */
const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walk(p));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = [...walk(SRC), join(ROOT, 'App.tsx')];

const under = (file: string, dir: string) =>
  relative(ROOT, file).replace(/\\/g, '/').startsWith(dir);

describe('token discipline', () => {
  const HEX = /['"]#[0-9a-fA-F]{3,8}['"]/;
  const FONT_SIZE = /\bfontSize\s*:/;
  const RAW_SPACING =
    /\b(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?\s*:\s*-?\d/;

  it('no raw hex colour outside src/theme/', () => {
    const offenders = files
      .filter((f) => !under(f, 'src/theme'))
      .filter((f) => HEX.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('no bare fontSize outside src/theme/ + src/components/', () => {
    const offenders = files
      .filter((f) => !under(f, 'src/theme') && !under(f, 'src/components'))
      .filter((f) => FONT_SIZE.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('no hard-coded pixel padding/margin outside src/theme/ + src/components/', () => {
    const offenders = files
      .filter((f) => !under(f, 'src/theme') && !under(f, 'src/components'))
      .filter((f) => RAW_SPACING.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
