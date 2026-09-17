import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReviewQueueScreen } from '../ReviewQueueScreen';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useCustodyStore } from '../../store/custodyStore';
import { useSplitStore } from '../../store/splitStore';
import { strings } from '../../i18n/strings';
import type { Household } from '../../models/Household';
import type { PatternProposal } from '../../models/Custody';
import type { SplitProposal } from '../../models/Split';

jest.mock('../../store/authStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../../store/householdStore', () => ({ useHouseholdStore: jest.fn() }));
jest.mock('../../store/custodyStore', () => ({ useCustodyStore: jest.fn() }));
jest.mock('../../store/splitStore', () => ({ useSplitStore: jest.fn() }));

const mockedAuth = useAuthStore as unknown as jest.Mock;
const mockedHousehold = useHouseholdStore as unknown as jest.Mock;
const mockedCustody = useCustodyStore as unknown as jest.Mock;
const mockedSplit = useSplitStore as unknown as jest.Mock;

function pick<T extends object>(state: T) {
  return (sel?: (s: T) => unknown) => (sel ? sel(state) : state);
}

const household: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1', 'u2'],
  children: [],
  pendingInviteCode: null,
  timezone: 'America/Santiago',
  coParentName: null,
  coParentJoinedAt: 1,
  createdBy: 'u1',
  createdAt: 0,
};
const members = [
  { uid: 'u1', displayName: 'Javiera', isYou: false },
  { uid: 'u2', displayName: 'Cristián', isYou: true },
];

const provisionalPattern: PatternProposal = {
  id: 'pat1',
  type: 'pattern',
  proposerId: 'u1',
  status: 'approved',
  createdAt: 1,
  resolvedAt: 1,
  resolvedBy: 'u1', // self-approved while solo
  acknowledgedBy: null,
  cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  anchorDate: '2026-09-07',
  changeoverTime: '18:00',
  effectiveFrom: '2026-09-07',
  presetLabel: 'alternating-weeks',
};

const provisionalSplit: SplitProposal = {
  id: 'sp1',
  proposerId: 'u1',
  status: 'approved',
  createdAt: 1,
  resolvedAt: 1,
  resolvedBy: 'u1',
  acknowledgedBy: null,
  defaultPercentA: 70,
  overrides: {},
};

function setup(custodyProposals: PatternProposal[], splitProposals: SplitProposal[]) {
  const acknowledge = jest.fn(async () => true);
  const acknowledgeProposal = jest.fn(async () => true);
  mockedAuth.mockImplementation(pick({ user: { uid: 'u2', displayName: 'Cristián' } }));
  mockedHousehold.mockReturnValue({ household, members });
  mockedCustody.mockReturnValue({
    proposals: custodyProposals,
    isSubmitting: false,
    acknowledge,
  });
  mockedSplit.mockReturnValue({
    proposals: splitProposals,
    isSubmitting: false,
    acknowledgeProposal,
  });
  return { acknowledge, acknowledgeProposal };
}

describe('ReviewQueueScreen', () => {
  it('shows the empty state when nothing is provisional', async () => {
    setup([], []);
    await render(
      <ReviewQueueScreen onBack={jest.fn()} onOpenCalendar={jest.fn()} onOpenSplitTable={jest.fn()} />,
    );
    expect(screen.getByText(strings.solo.review.empty)).toBeTruthy();
  });

  it('lists a provisional pattern and accepts it', async () => {
    const { acknowledge } = setup([provisionalPattern], []);
    await render(
      <ReviewQueueScreen onBack={jest.fn()} onOpenCalendar={jest.fn()} onOpenSplitTable={jest.fn()} />,
    );

    expect(screen.getByTestId('review-item-custody-pat1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('review-accept-custody-pat1'));
    expect(acknowledge).toHaveBeenCalledWith('pat1');
  });

  it('lists a provisional split table and accepts it', async () => {
    const { acknowledgeProposal } = setup([], [provisionalSplit]);
    await render(
      <ReviewQueueScreen onBack={jest.fn()} onOpenCalendar={jest.fn()} onOpenSplitTable={jest.fn()} />,
    );

    expect(screen.getByTestId('review-item-split-sp1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('review-accept-split-sp1'));
    expect(acknowledgeProposal).toHaveBeenCalledWith('sp1');
  });

  it('"proponer algo distinto" hands off to the owning tab', async () => {
    setup([provisionalPattern], []);
    const onOpenCalendar = jest.fn();
    await render(
      <ReviewQueueScreen onBack={jest.fn()} onOpenCalendar={onOpenCalendar} onOpenSplitTable={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('review-propose-custody-pat1'));
    expect(onOpenCalendar).toHaveBeenCalled();
  });

  it('excludes decisions the current user made themselves', async () => {
    setup([{ ...provisionalPattern, proposerId: 'u2', resolvedBy: 'u2' }], []);
    await render(
      <ReviewQueueScreen onBack={jest.fn()} onOpenCalendar={jest.fn()} onOpenSplitTable={jest.fn()} />,
    );
    expect(screen.getByText(strings.solo.review.empty)).toBeTruthy();
  });

  it('calls onBack', async () => {
    setup([], []);
    const onBack = jest.fn();
    await render(
      <ReviewQueueScreen onBack={onBack} onOpenCalendar={jest.fn()} onOpenSplitTable={jest.fn()} />,
    );
    fireEvent.press(screen.getByText(strings.common.back));
    expect(onBack).toHaveBeenCalled();
  });
});
