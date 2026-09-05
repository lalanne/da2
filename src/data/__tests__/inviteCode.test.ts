import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '../inviteCode';

describe('inviteCode', () => {
  it('generates an 8-char code from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      expect(code).toMatch(new RegExp(`^[${INVITE_CODE_ALPHABET}]{8}$`));
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('is deterministic given a fixed random source', () => {
    const code = generateInviteCode(() => 0);
    expect(code).toBe(INVITE_CODE_ALPHABET[0].repeat(INVITE_CODE_LENGTH));
  });

  it('normalizes user input: trims, uppercases, strips spaces and dashes', () => {
    expect(normalizeInviteCode('  abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeInviteCode('ab cd 23 45')).toBe('ABCD2345');
  });

  it('accepts a well-formed code and rejects malformed ones', () => {
    expect(isValidInviteCode('ABCD2345')).toBe(true);
    expect(isValidInviteCode('ABCD234')).toBe(false); // too short
    expect(isValidInviteCode('ABCD23450')).toBe(false); // too long
    expect(isValidInviteCode('ABCD012I')).toBe(false); // ambiguous chars
    expect(isValidInviteCode('abcd2345')).toBe(false); // lowercase (caller normalizes first)
  });
});
