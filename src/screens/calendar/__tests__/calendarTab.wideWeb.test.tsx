import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarTab } from '../CalendarTab';
import { useAuthStore } from '../../../store/authStore';
import { useHouseholdStore } from '../../../store/householdStore';
import { useCustodyStore } from '../../../store/custodyStore';
import { useEventsStore } from '../../../store/eventsStore';
import { useReceiptsStore } from '../../../store/receiptsStore';
import { useSplitStore } from '../../../store/splitStore';
import { useWideWeb } from '../../../web/useWideWeb';
import type { Household } from '../../../models/Household';
import type { KidEvent } from '../../../models/Event';
import type { DayOverrideProposal, PatternProposal } from '../../../models/Custody';

jest.mock('../../../store/authStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../../../store/householdStore', () => ({ useHouseholdStore: jest.fn() }));
jest.mock('../../../store/custodyStore', () => ({ useCustodyStore: jest.fn() }));
jest.mock('../../../store/eventsStore', () => ({ useEventsStore: jest.fn() }));
jest.mock('../../../store/receiptsStore', () => ({ useReceiptsStore: jest.fn() }));
jest.mock('../../../store/splitStore', () => ({ useSplitStore: jest.fn() }));
jest.mock('../../../web/useWideWeb', () => ({ useWideWeb: jest.fn() }));

const mockedAuth = useAuthStore as unknown as jest.Mock;
const mockedHousehold = useHouseholdStore as unknown as jest.Mock;
const mockedCustody = useCustodyStore as unknown as jest.Mock;
const mockedEvents = useEventsStore as unknown as jest.Mock;
const mockedReceipts = useReceiptsStore as unknown as jest.Mock;
const mockedSplit = useSplitStore as unknown as jest.Mock;
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
const pattern: PatternProposal = {
  id: 'p1',
  type: 'pattern',
  proposerId: 'u1',
  status: 'approved',
  createdAt: 0,
  resolvedAt: 1,
  resolvedBy: 'u2',
  cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  anchorDate: '2026-09-07',
  changeoverTime: '18:00',
  effectiveFrom: '2026-09-01',
  presetLabel: 'alternating-weeks',
};
const pendingOverride: DayOverrideProposal = {
  id: 'ov1',
  type: 'day-override',
  proposerId: 'u2',
  status: 'pending',
  createdAt: 0,
  resolvedAt: null,
  resolvedBy: null,
  date: '2026-09-18',
  assignedTo: 1,
  startTime: null,
  endTime: null,
};
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

function setup(wideWeb: boolean, extraProposals: typeof pendingOverride[] = [], resolve = jest.fn()) {
  mockedWideWeb.mockReturnValue(wideWeb);
  mockedAuth.mockImplementation(selectable({ user: { uid: 'u1', displayName: 'Javiera' } }));
  mockedHousehold.mockReturnValue({ household, members });
  mockedCustody.mockReturnValue({
    proposals: [pattern, ...extraProposals],
    isSubmitting: false,
    resolve,
    cancel: jest.fn(),
    proposeDayOverride: jest.fn(),
    proposePattern: jest.fn(),
  });
  mockedEvents.mockImplementation(selectable({ events: [event], isSubmitting: false }));
  mockedReceipts.mockImplementation(selectable({ shared: [] }));
  mockedSplit.mockImplementation(selectable({ settlements: [] }));
}

describe('CalendarTab — wide web (spec 012)', () => {
  it('renders the base calendar without a side rail on native/narrow', async () => {
    setup(false);
    await render(<CalendarTab />);

    expect(screen.queryByTestId('calendar-rail')).toBeNull();
  });

  it('renders the side rail with upcoming events on a wide web window', async () => {
    setup(true);
    await render(<CalendarTab />);

    expect(screen.getByTestId('calendar-rail')).toBeTruthy();
    expect(screen.getByTestId('calendar-rail-event-e1')).toBeTruthy();
  });

  it('opens a push view as a WebDialog over the still-visible calendar on wide web', async () => {
    setup(true);
    await render(<CalendarTab />);

    // Base calendar month grid should already be visible.
    expect(screen.getByTestId('day-2026-09-15')).toBeTruthy();

    fireEvent.press(screen.getByTestId('day-2026-09-15'));

    // The dialog now hosts the day detail, while the calendar stays mounted.
    expect(await screen.findByTestId('calendar-dialog')).toBeTruthy();
    expect(screen.getByTestId('day-2026-09-15')).toBeTruthy();
  });

  it('calls onOpenTab when the rail links to Eventos or Recibos', async () => {
    setup(true);
    const onOpenTab = jest.fn();
    await render(<CalendarTab onOpenTab={onOpenTab} />);

    fireEvent.press(screen.getByTestId('calendar-rail-view-events'));
    expect(onOpenTab).toHaveBeenCalledWith('events');
  });

  it('shows a pending proposal in the rail and resolves it from there', async () => {
    const resolve = jest.fn();
    setup(true, [pendingOverride], resolve);
    await render(<CalendarTab />);

    expect(screen.getByTestId('calendar-rail-pending')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`calendar-rail-approve-${pendingOverride.id}`));

    expect(resolve).toHaveBeenCalledWith(pendingOverride.id, 'approved');
  });
});
