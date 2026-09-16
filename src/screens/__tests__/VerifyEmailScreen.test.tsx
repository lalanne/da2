import { fireEvent, render, screen } from '@testing-library/react-native';
import { VerifyEmailScreen } from '../VerifyEmailScreen';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../i18n/strings';

jest.mock('../../store/authStore', () => ({ useAuthStore: jest.fn() }));

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

const unverifiedUser = {
  uid: 'u1',
  displayName: 'Ana',
  email: 'ana@example.com',
  photoUrl: null,
  emailVerified: false,
};

function baseState(overrides: Record<string, unknown> = {}) {
  const state = {
    user: unverifiedUser,
    isSigningIn: false,
    error: null,
    resendVerificationEmail: jest.fn(async () => true),
    refreshEmailVerified: jest.fn(async () => true),
    signOut: jest.fn(async () => {}),
    ...overrides,
  };
  mockedUseAuthStore.mockReturnValue(state);
  mockedUseAuthStore.getState = () => state;
  return state;
}

describe('VerifyEmailScreen', () => {
  it('shows the signed-in email', async () => {
    baseState();
    await render(<VerifyEmailScreen />);

    expect(screen.getByText(strings.auth.verify.body('ana@example.com'))).toBeTruthy();
  });

  it('resends the verification email and shows confirmation', async () => {
    const resendVerificationEmail = jest.fn(async () => true);
    baseState({ resendVerificationEmail });
    await render(<VerifyEmailScreen />);

    fireEvent.press(screen.getByTestId('verify-resend-button'));

    expect(await screen.findByTestId('resend-sent-banner')).toBeTruthy();
    expect(resendVerificationEmail).toHaveBeenCalled();
  });

  it('shows "not yet verified" when confirming before the link was clicked', async () => {
    // refreshEmailVerified resolves ok, but the store's user stays unverified
    baseState({ refreshEmailVerified: jest.fn(async () => true), user: unverifiedUser });
    await render(<VerifyEmailScreen />);

    fireEvent.press(screen.getByTestId('verify-confirm-button'));

    expect(await screen.findByTestId('not-yet-verified-banner')).toBeTruthy();
  });

  it('signs out when the escape hatch is pressed', async () => {
    const signOut = jest.fn(async () => {});
    baseState({ signOut });
    await render(<VerifyEmailScreen />);

    fireEvent.press(screen.getByTestId('verify-sign-out-button'));
    expect(signOut).toHaveBeenCalled();
  });
});
