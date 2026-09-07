import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthGrid } from '../MonthGrid';
import { DayDetail } from '../DayDetail';
import type { Household } from '../../../models/Household';
import type { PatternProposal } from '../../../models/Custody';

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

describe('MonthGrid', () => {
  it('renders a cell per day and calls onSelectDay on tap', async () => {
    const onSelectDay = jest.fn();
    await render(
      <MonthGrid
        month="2026-09-15"
        patterns={[pattern]}
        overrides={[]}
        today="2026-09-15"
        pendingDates={new Set(['2026-09-20'])}
        onSelectDay={onSelectDay}
      />,
    );

    expect(screen.getByTestId('day-2026-09-01')).toBeTruthy();
    expect(screen.getByTestId('day-2026-09-30')).toBeTruthy();
    fireEvent.press(screen.getByTestId('day-2026-09-15'));
    expect(onSelectDay).toHaveBeenCalledWith('2026-09-15');
  });
});

describe('DayDetail', () => {
  it('shows the changeover split for a changeover day', async () => {
    await render(
      <DayDetail
        date="2026-09-14"
        patterns={[pattern]}
        overrides={[]}
        pendingForDate={[]}
        household={household}
        members={members}
        onPropose={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByText('Con Javiera')).toBeTruthy();
    expect(screen.getByText('Con Cristián')).toBeTruthy();
    expect(screen.getByTestId('day-propose-button')).toBeTruthy();
  });
});
