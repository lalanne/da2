import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { WebShell } from '../WebShell';
import { useAuthStore } from '../../store/authStore';

jest.mock('../../store/authStore', () => ({ useAuthStore: jest.fn() }));

const mockedAuth = useAuthStore as unknown as jest.Mock;

const items = [
  { key: 'calendar', label: 'Calendario', badge: 2 },
  { key: 'events', label: 'Eventos' },
  { key: 'receipts', label: 'Recibos' },
  { key: 'household', label: 'Hogar' },
];

describe('WebShell', () => {
  beforeEach(() => {
    mockedAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Javiera', email: null, photoUrl: null },
      signOut: jest.fn(),
    });
  });

  it('renders every destination, the active state, and the pending badge', async () => {
    await render(
      <WebShell items={items} active="calendar" onChange={jest.fn()}>
        <RNText>content</RNText>
      </WebShell>,
    );

    expect(screen.getByTestId('web-nav-calendar')).toBeTruthy();
    expect(screen.getByTestId('web-nav-events')).toBeTruthy();
    expect(screen.getByTestId('web-nav-receipts')).toBeTruthy();
    expect(screen.getByTestId('web-nav-household')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // badge
    expect(screen.getByText('content')).toBeTruthy(); // hosted tab content
  });

  it('calls onChange with the pressed destination key', async () => {
    const onChange = jest.fn();
    await render(
      <WebShell items={items} active="calendar" onChange={onChange}>
        <RNText>content</RNText>
      </WebShell>,
    );

    fireEvent.press(screen.getByTestId('web-nav-receipts'));
    expect(onChange).toHaveBeenCalledWith('receipts');
  });

  it('signs out when the account row is pressed', async () => {
    const signOut = jest.fn();
    mockedAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Javiera', email: null, photoUrl: null },
      signOut,
    });
    await render(
      <WebShell items={items} active="calendar" onChange={jest.fn()}>
        <RNText>content</RNText>
      </WebShell>,
    );

    fireEvent.press(screen.getByTestId('web-nav-sign-out'));
    expect(signOut).toHaveBeenCalled();
  });
});
