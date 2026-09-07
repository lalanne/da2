import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, ListRow, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useEventsStore } from '../../store/eventsStore';
import { upcomingOccurrences } from '../../events';
import { todayInTimezone } from '../../custody';
import type { KidEvent } from '../../models/Event';
import { dayLabel } from '../calendar/labels';
import { EventForm } from './EventForm';
import { EventDetail } from './EventDetail';
import { childrenLabel, eventTimeLabel, eventTypeLabel } from './labels';

type EvView =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'detail'; event: KidEvent }
  | { name: 'edit'; event: KidEvent };

const HORIZON_DAYS = 90;
const LIMIT = 30;

export function EventsTab() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const events = useEventsStore((s) => s.events);
  const isSubmitting = useEventsStore((s) => s.isSubmitting);
  const [view, setView] = useState<EvView>({ name: 'list' });

  const today = todayInTimezone(household?.timezone ?? 'America/Santiago');
  const upcoming = useMemo(
    () => upcomingOccurrences(events, today, HORIZON_DAYS, LIMIT),
    [events, today],
  );

  if (!household || !uid) return null;

  if (view.name === 'new') {
    return (
      <EventForm
        household={household}
        isSubmitting={isSubmitting}
        onSubmit={async (input) => {
          const ok = await useEventsStore.getState().create(input);
          if (ok) setView({ name: 'list' });
          return ok;
        }}
        onBack={() => setView({ name: 'list' })}
      />
    );
  }

  if (view.name === 'edit') {
    return (
      <EventForm
        household={household}
        initial={view.event}
        isSubmitting={isSubmitting}
        onSubmit={async (input) => {
          const ok = await useEventsStore.getState().update(view.event.id, input);
          if (ok) setView({ name: 'detail', event: { ...view.event, ...input } as KidEvent });
          return ok;
        }}
        onBack={() => setView({ name: 'detail', event: view.event })}
      />
    );
  }

  if (view.name === 'detail') {
    // Re-read the live event so the detail reflects concurrent edits.
    const live = events.find((e) => e.id === view.event.id) ?? view.event;
    return (
      <EventDetail
        event={live}
        household={household}
        members={members}
        onEdit={() => setView({ name: 'edit', event: live })}
        onDelete={async () => {
          const ok = await useEventsStore.getState().remove(live.id);
          if (ok) setView({ name: 'list' });
        }}
        onBack={() => setView({ name: 'list' })}
      />
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {strings.events.tabTitle}
      </Text>

      {upcoming.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {strings.events.empty}
        </Text>
      ) : (
        <Card flush>
          {upcoming.map(({ event, date }, i) => (
            <View key={`${event.id}-${date}`}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                title={event.title}
                subtitle={`${dayLabel(date)} · ${eventTimeLabel(event)} · ${childrenLabel(event.childIds, household)}`}
                leading={<TypeTag type={eventTypeLabel(event.type)} />}
                onPress={() => setView({ name: 'detail', event })}
                testID={`event-row-${event.id}`}
              />
            </View>
          ))}
        </Card>
      )}

      <View style={styles.spacer} />
      <Button
        title={strings.events.add}
        onPress={() => setView({ name: 'new' })}
        testID="events-add-button"
      />
    </Screen>
  );
}

function TypeTag({ type }: { type: string }) {
  return (
    <View style={styles.tag}>
      <Text variant="caption" color="textSecondary">
        {type}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
  tag: {
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
