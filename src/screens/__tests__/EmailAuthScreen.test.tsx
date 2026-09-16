import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EmailAuthScreen } from '../EmailAuthScreen';
import { useAuthStore } from '../../store/authStore';
import { strings } from '../../i18n/strings';

jest.mock('../../store/authStore', () => ({ useAuthStore: jest.fn() }));

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    signUpWithEmail: jest.fn(async () => true),
    signInWithEmail: jest.fn(async () => true),
    sendPasswordReset: jest.fn(async () => true),
    isSigningIn: false,
    error: null,
    ...overrides,
  };
}

// RNTL 14 + React 19: a bare `fireEvent` can race the component's own state
// update on this screen's `<Screen>`/`KeyboardAvoidingView` (a documented
// flakiness pattern in this repo — see memory). Wrapping each interaction
// in `act` keeps every field-fill test deterministic.
async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

async function type(testID: string, text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
}

describe('EmailAuthScreen', () => {
  it('defaults to sign-in mode', async () => {
    mockedUseAuthStore.mockReturnValue(baseState());
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    expect(screen.queryByTestId('signup-name-field')).toBeNull();
    expect(screen.getByTestId('email-submit-button')).toHaveTextContent(
      strings.auth.email.signInSubmit,
    );
  });

  it('switches to sign-up mode and shows the name field', async () => {
    mockedUseAuthStore.mockReturnValue(baseState());
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    await press('email-mode-signup');

    expect(screen.getByTestId('signup-name-field')).toBeTruthy();
  });

  it('validates locally before calling the store — rejects a short password', async () => {
    const signUpWithEmail = jest.fn(async () => true);
    mockedUseAuthStore.mockReturnValue(baseState({ signUpWithEmail }));
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    await press('email-mode-signup');
    await type('signup-name-field', 'Ana');
    await type('email-field', 'ana@example.com');
    await type('password-field', 'short');
    await press('email-submit-button');

    expect(screen.getByText(strings.auth.email.passwordTooShort)).toBeTruthy();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('submits sign-up with valid fields', async () => {
    const signUpWithEmail = jest.fn(async () => true);
    mockedUseAuthStore.mockReturnValue(baseState({ signUpWithEmail }));
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    await press('email-mode-signup');
    await type('signup-name-field', 'Ana');
    await type('email-field', 'ana@example.com');
    await type('password-field', 'password123');
    await press('email-submit-button');

    expect(signUpWithEmail).toHaveBeenCalledWith('Ana', 'ana@example.com', 'password123');
  });

  it('submits sign-in with valid fields', async () => {
    const signInWithEmail = jest.fn(async () => true);
    mockedUseAuthStore.mockReturnValue(baseState({ signInWithEmail }));
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    await type('email-field', 'ana@example.com');
    await type('password-field', 'password123');
    await press('email-submit-button');

    expect(signInWithEmail).toHaveBeenCalledWith('ana@example.com', 'password123');
  });

  it('shows the store error alongside the form', async () => {
    mockedUseAuthStore.mockReturnValue(baseState({ error: strings.auth.errors.wrongCredentials }));
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    expect(screen.getByText(strings.auth.errors.wrongCredentials)).toBeTruthy();
  });

  it('forgot password flow: sends a reset and shows the same confirmation for any email', async () => {
    const sendPasswordReset = jest.fn(async () => true);
    mockedUseAuthStore.mockReturnValue(baseState({ sendPasswordReset }));
    await render(<EmailAuthScreen onBack={jest.fn()} />);

    await press('forgot-password-button');
    await type('reset-email-field', 'ana@example.com');
    await press('reset-submit-button');

    expect(screen.getByTestId('reset-sent-banner')).toHaveTextContent(strings.auth.email.reset.sent);
    expect(sendPasswordReset).toHaveBeenCalledWith('ana@example.com');
  });

  it('calls onBack when the back button is pressed', async () => {
    const onBack = jest.fn();
    mockedUseAuthStore.mockReturnValue(baseState());
    await render(<EmailAuthScreen onBack={onBack} />);

    await press('email-auth-back-button');
    expect(onBack).toHaveBeenCalled();
  });
});
