import { createEventsStore } from '../eventsStore';
import type { EventsRepository } from '../../data/eventsRepository';
import type { KidEvent, NewEventInput } from '../../models/Event';
import { strings } from '../../i18n/strings';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeRepo() {
  let cb: ((e: KidEvent[]) => void) | undefined;
  const repo: EventsRepository = {
    subscribeToEvents: jest.fn((_hid, next) => {
      cb = next;
      return jest.fn();
    }),
    createEvent: jest.fn(async () => {}),
    updateEvent: jest.fn(async () => {}),
    deleteEvent: jest.fn(async () => {}),
  };
  return { repo, emit: (e: KidEvent[]) => cb?.(e) };
}

const input: NewEventInput = {
  title: 'Dentista',
  type: 'doctor',
  childIds: ['c1'],
  date: '2026-10-12',
  allDay: false,
  startTime: '15:00',
  endTime: null,
  location: null,
  notes: null,
  recurrence: null,
};

describe('eventsStore', () => {
  it('subscribes on start and becomes ready on the first snapshot', async () => {
    const { repo, emit } = makeRepo();
    const store = createEventsStore(repo);
    store.getState().start('h1', 'u1');
    expect(store.getState().status).toBe('loading');
    emit([]);
    await flush();
    expect(store.getState().status).toBe('ready');
  });

  it('create / update / remove forward to the repo with hid + uid', async () => {
    const { repo } = makeRepo();
    const store = createEventsStore(repo);
    store.getState().start('h1', 'u1');

    await store.getState().create(input);
    expect(repo.createEvent).toHaveBeenCalledWith('h1', 'u1', input);

    await store.getState().update('e9', input);
    expect(repo.updateEvent).toHaveBeenCalledWith('h1', 'e9', 'u1', input);

    await store.getState().remove('e9');
    expect(repo.deleteEvent).toHaveBeenCalledWith('h1', 'e9');
  });

  it('surfaces a failure with the error code', async () => {
    const { repo } = makeRepo();
    (repo.createEvent as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'firestore/permission-denied' }),
    );
    const store = createEventsStore(repo);
    store.getState().start('h1', 'u1');

    expect(await store.getState().create(input)).toBe(false);
    expect(store.getState().actionError).toBe(
      `${strings.events.errors.saveFailed} [firestore/permission-denied]`,
    );
  });

  it('ignores a concurrent action', async () => {
    const { repo } = makeRepo();
    let release: () => void = () => {};
    (repo.createEvent as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => { release = () => r(); }),
    );
    const store = createEventsStore(repo);
    store.getState().start('h1', 'u1');

    const first = store.getState().create(input);
    const second = await store.getState().create(input);
    release();
    await first;

    expect(second).toBe(false);
    expect(repo.createEvent).toHaveBeenCalledTimes(1);
  });
});
