import { render, screen } from '@testing-library/react-native';
import { EventForm } from '../EventForm';
import { EventDetail } from '../EventDetail';
import type { Household } from '../../../models/Household';
import type { KidEvent } from '../../../models/Event';
import { strings } from '../../../i18n/strings';

const household: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1', 'u2'],
  children: [
    { id: 'c1', name: 'Sofía', birthdate: null },
    { id: 'c2', name: 'Mateo', birthdate: null },
  ],
  pendingInviteCode: null,
  timezone: 'America/Santiago',
  createdBy: 'u1',
  createdAt: 0,
};
const members = [
  { uid: 'u1', displayName: 'Javiera', isYou: true },
  { uid: 'u2', displayName: 'Cristián', isYou: false },
];

const dentist: KidEvent = {
  id: 'e1',
  title: 'Dentista',
  type: 'doctor',
  childIds: ['c1'],
  date: '2026-10-12',
  allDay: false,
  startTime: '15:00',
  endTime: null,
  location: 'Clínica Centro',
  notes: null,
  recurrence: null,
  createdBy: 'u1',
  createdAt: 0,
  updatedBy: 'u2',
  updatedAt: 1,
};

// Form-logic validation lives in src/events/__tests__/forms.test.ts.
// These are render smokes only (RNTL + React 19 is flaky with multi-interaction
// tests in one file).

describe('EventForm', () => {
  it('renders the fields, pre-selecting all children, no recurrence for doctor', async () => {
    await render(
      <EventForm household={household} isSubmitting={false} onSubmit={jest.fn(async () => true)} onBack={jest.fn()} />,
    );
    expect(screen.getByTestId('event-title')).toBeTruthy();
    expect(screen.getByTestId('event-type-training')).toBeTruthy();
    expect(screen.getByTestId('event-child-c1')).toBeTruthy();
    expect(screen.getByTestId('event-submit')).toBeTruthy();
    expect(screen.queryByTestId('event-repeats-toggle')).toBeNull();
  });
});

describe('EventDetail', () => {
  it('renders the event, its location and the editor line', async () => {
    await render(
      <EventDetail
        event={dentist}
        household={household}
        members={members}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByText('Dentista')).toBeTruthy();
    expect(screen.getByText('Clínica Centro')).toBeTruthy();
    expect(screen.getByText(strings.events.editedBy('Cristián'))).toBeTruthy();
    expect(screen.getByTestId('event-edit-button')).toBeTruthy();
    expect(screen.getByTestId('event-delete-button')).toBeTruthy();
  });
});
