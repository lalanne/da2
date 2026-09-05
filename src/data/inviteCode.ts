/**
 * Invite code generation and validation. Spec 002: 8 characters from an
 * unambiguous alphabet (no 0/O/1/I), used as the inviteCodes document id.
 */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

const INVITE_CODE_PATTERN = new RegExp(
  `^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`,
);

export function generateInviteCode(
  randomInt: (maxExclusive: number) => number = defaultRandomInt,
): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalizes user input (trim, uppercase, strip spaces/dashes) before validation. */
export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidInviteCode(input: string): boolean {
  return INVITE_CODE_PATTERN.test(input);
}

function defaultRandomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}
