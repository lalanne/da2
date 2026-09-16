import { fireEvent, render, screen } from '@testing-library/react-native';
import { WelcomeScreen } from '../WelcomeScreen';
import { useAuthStore } from '../../store/authStore';

jest.mock('../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

describe('WelcomeScreen', () => {
  it('signs in when the Google button is pressed', async () => {
    const signIn = jest.fn();
    mockedUseAuthStore.mockReturnValue({ signIn, isSigningIn: false, error: null });

    await render(<WelcomeScreen />);
    fireEvent.press(screen.getByTestId('google-sign-in-button'));

    expect(signIn).toHaveBeenCalled();
  });

  it('shows the button in a loading state while signing in', async () => {
    mockedUseAuthStore.mockReturnValue({ signIn: jest.fn(), isSigningIn: true, error: null });

    await render(<WelcomeScreen />);

    expect(screen.getByTestId('google-sign-in-button-loading')).toBeTruthy();
  });

  it('renders an error message when sign-in fails', async () => {
    mockedUseAuthStore.mockReturnValue({ signIn: jest.fn(), isSigningIn: false, error: 'Network error.' });

    await render(<WelcomeScreen />);

    expect(screen.getByTestId('sign-in-error')).toHaveTextContent('Network error.');
  });

  it('switches to the email auth screen and back (spec 014)', async () => {
    mockedUseAuthStore.mockReturnValue({
      signIn: jest.fn(),
      isSigningIn: false,
      error: null,
      signUpWithEmail: jest.fn(),
      signInWithEmail: jest.fn(),
      sendPasswordReset: jest.fn(),
    });

    await render(<WelcomeScreen />);
    fireEvent.press(screen.getByTestId('continue-with-email-button'));

    expect(await screen.findByTestId('email-auth-screen')).toBeTruthy();

    fireEvent.press(screen.getByTestId('email-auth-back-button'));
    expect(await screen.findByTestId('google-sign-in-button')).toBeTruthy();
  });
});
