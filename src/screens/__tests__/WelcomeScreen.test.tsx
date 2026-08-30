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

  it('shows a spinner instead of the button while signing in', async () => {
    mockedUseAuthStore.mockReturnValue({ signIn: jest.fn(), isSigningIn: true, error: null });

    await render(<WelcomeScreen />);

    expect(screen.getByTestId('sign-in-spinner')).toBeTruthy();
    expect(screen.queryByTestId('google-sign-in-button')).toBeNull();
  });

  it('renders an error message when sign-in fails', async () => {
    mockedUseAuthStore.mockReturnValue({ signIn: jest.fn(), isSigningIn: false, error: 'Network error.' });

    await render(<WelcomeScreen />);

    expect(screen.getByTestId('sign-in-error')).toHaveTextContent('Network error.');
  });
});
