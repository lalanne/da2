import { fireEvent, render, screen } from '@testing-library/react-native';
import { EventsTab } from '../EventsTab';
import { useAuthStore } from '../../../store/authStore';
import { useHouseholdStore } from '../../../store/householdStore';
import { useEventsStore } from '../../../store/eventsStore';
import { useWideWeb } from '../../../web/useWideWeb';
import type { Household } from '../../../models/Household';
import type { KidEvent } from '../../../models/Event';

jest.mock('../../../store/authStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../../../store/householdStore', () => ({ useHouseholdStore: jest.fn() }));
jest.mock('../../../store/eventsStore', () => {
  const actual = jest.requireActual('../../../store/eventsStore');
  return { ...actual, useEventsStore: jest.fn() };
});
jest.mock('../../../web/useWideWeb', () => ({ useWideWeb: jest.fn() }));

const mockedAuth = useAuthStore as unknown as jest.Mock;
const mockedHousehold = useHouseholdStore as unknown as jest.Mock;
const mockedEvents = useEventsStore as unknown as jest.Mock;
const mockedWideWeb = useWideWeb as unknown as jest.Mock;

function selectable(state: Record<string, unknown>) {
  return (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(state) : state;
}

const household: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1', 'u2'],
  children: [],
  pendingInviteCode: null,
  timezone: 'America/Santiago',
  createdBy: 'u1',
  createdAt: 0,
};
const members = [
  { uid: 'u1', displayName: 'Javiera', isYou: true },
  { uid: 'u2', displayName: 'Cristián', isYou: false },
];
const event: KidEvent = {
  id: 'e1',
  title: 'Dentista',
  type: 'doctor',
  date: '2026-09-20',
  startTime: null,
  endTime: null,
  allDay: true,
  childIds: [],
  location: null,
  notes: null,
  recurrence: null,
  createdBy: 'u1',
  createdAt: 0,
  updatedBy: 'u1',
  updatedAt: 0,
};

describe('EventsTab — wide web (spec 012)', () => {
  beforeEach(() => {
    mockedWideWeb.mockReturnValue(true);
    mockedAuth.mockImplementation(selectable({ user: { uid: 'u1', displayName: 'Javiera' } }));
    mockedHousehold.mockReturnValue({ household, members });
    mockedEvents.mockImplementation(selectable({ events: [event], isSubmitting: false }));
  });

  it('shows the list and an empty detail pane side by side before anything is selected', async () => {
    await render(<EventsTab />);

    expect(screen.getByTestId('event-row-e1')).toBeTruthy();
    expect(screen.getByTestId('events-detail-pane')).toBeTruthy();
  });

  it('opens the detail pane in place, next to the still-visible list, on selection', async () => {
    await render(<EventsTab />);

    fireEvent.press(screen.getByTestId('event-row-e1'));

    // The list row is still there (master column stays mounted)...
    expect(screen.getByTestId('event-row-e1')).toBeTruthy();
    // ...and the detail pane now shows the selected event.
    expect(await screen.findByTestId('events-detail-pane')).toBeTruthy();
  });

  it('opens the new-event form as a WebDialog over the list', async () => {
    await render(<EventsTab />);

    fireEvent.press(screen.getByTestId('events-add-button'));

    expect(await screen.findByTestId('events-dialog')).toBeTruthy();
    // The list stays mounted underneath.
    expect(screen.getByTestId('event-row-e1')).toBeTruthy();
  });
});
