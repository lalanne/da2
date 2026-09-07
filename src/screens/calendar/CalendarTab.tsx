import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useCustodyStore } from '../../store/custodyStore';
import { useEventsStore } from '../../store/eventsStore';
import {
  addMonths,
  addDays,
  approvedOverrides,
  approvedPatterns,
  hasPendingPattern,
  pendingDates,
  pendingForResponder,
  startOfMonth,
  todayInTimezone,
} from '../../custody';
import { eventCountsByDate, eventsForDay } from '../../events';
import type { KidEvent } from '../../models/Event';
import { MonthGrid } from './MonthGrid';
import { DayDetail } from './DayDetail';
import { ProposeOverride } from './ProposeOverride';
import { PatternSetup } from './PatternSetup';
import { ProposalsList } from './ProposalsList';
import { EventDetail } from '../events/EventDetail';
import { EventForm } from '../events/EventForm';
import { monthLabel } from './labels';
import { parentName, parentStrong } from './parents';

type CalView =
  | { name: 'calendar' }
  | { name: 'day'; date: string }
  | { name: 'propose'; date: string }
  | { name: 'pattern-setup' }
  | { name: 'proposals' }
  | { name: 'event'; event: KidEvent; from: string }
  | { name: 'event-edit'; event: KidEvent; from: string };

export function CalendarTab() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const custody = useCustodyStore();
  const proposals = custody.proposals;
  const events = useEventsStore((s) => s.events);
  const eventsSubmitting = useEventsStore((s) => s.isSubmitting);

  const [view, setView] = useState<CalView>({ name: 'calendar' });
  const tz = household?.timezone ?? 'America/Santiago';
  const today = todayInTimezone(tz);
  const [month, setMonth] = useState(() => startOfMonth(today));

  const patterns = useMemo(() => approvedPatterns(proposals), [proposals]);
  const overrides = useMemo(() => approvedOverrides(proposals), [proposals]);
  const pendingDatesSet = useMemo(() => pendingDates(proposals), [proposals]);
  const eventCounts = useMemo(
    () => eventCountsByDate(events, startOfMonth(month), addDays(startOfMonth(addMonths(month, 1)), -1)),
    [events, month],
  );
  const toRespond = useMemo(
    () => (uid ? pendingForResponder(proposals, uid) : []),
    [proposals, uid],
  );
  const pendingPattern = hasPendingPattern(proposals);

  if (!household || !uid) return null;
  const s = strings.custody;
  const otherIndex = Math.max(0, household.parentIds.findIndex((id) => id !== uid));
  const awaitingMyPattern =
    !patterns.length && pendingPattern && !toRespond.some((p) => p.type === 'pattern');

  if (view.name === 'proposals') {
    return (
      <ProposalsList
        proposals={proposals}
        currentUid={uid}
        household={household}
        members={members}
        isSubmitting={custody.isSubmitting}
        onResolve={(id, decision) => void custody.resolve(id, decision)}
        onCancel={(id) => void custody.cancel(id)}
        onBack={() => setView({ name: 'calendar' })}
      />
    );
  }

  if (view.name === 'pattern-setup') {
    return (
      <PatternSetup
        household={household}
        members={members}
        isSubmitting={custody.isSubmitting}
        onSubmit={async (input) => {
          const ok = await custody.proposePattern(input);
          if (ok) setView({ name: 'calendar' });
          return ok;
        }}
        onBack={() => setView({ name: 'calendar' })}
      />
    );
  }

  if (view.name === 'event' || view.name === 'event-edit') {
    const live = events.find((e) => e.id === view.event.id) ?? view.event;
    if (view.name === 'event-edit') {
      return (
        <EventForm
          household={household}
          initial={live}
          isSubmitting={eventsSubmitting}
          onSubmit={async (input) => {
            const ok = await useEventsStore.getState().update(live.id, input);
            if (ok) setView({ name: 'event', event: { ...live, ...input }, from: view.from });
            return ok;
          }}
          onBack={() => setView({ name: 'event', event: live, from: view.from })}
        />
      );
    }
    return (
      <EventDetail
        event={live}
        household={household}
        members={members}
        onEdit={() => setView({ name: 'event-edit', event: live, from: view.from })}
        onDelete={async () => {
          const ok = await useEventsStore.getState().remove(live.id);
          if (ok) setView({ name: 'day', date: view.from });
        }}
        onBack={() => setView({ name: 'day', date: view.from })}
      />
    );
  }

  if (view.name === 'day') {
    return (
      <DayDetail
        date={view.date}
        patterns={patterns}
        overrides={overrides}
        pendingForDate={proposals.filter(
          (p) => p.status === 'pending' && p.type === 'day-override' && p.date === view.date,
        )}
        events={eventsForDay(events, view.date)}
        household={household}
        members={members}
        onPropose={() => setView({ name: 'propose', date: view.date })}
        onSelectEvent={(event) => setView({ name: 'event', event, from: view.date })}
        onBack={() => setView({ name: 'calendar' })}
      />
    );
  }

  if (view.name === 'propose') {
    return (
      <ProposeOverride
        date={view.date}
        household={household}
        members={members}
        isSubmitting={custody.isSubmitting}
        onSubmit={async (input) => {
          const ok = await custody.proposeDayOverride(input);
          if (ok) setView({ name: 'calendar' });
          return ok;
        }}
        onBack={() => setView({ name: 'day', date: view.date })}
      />
    );
  }

  const hasPattern = patterns.length > 0;

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Text variant="title">{s.title}</Text>
        {toRespond.length > 0 ? (
          <Pressable
            onPress={() => setView({ name: 'proposals' })}
            testID="calendar-pending-chip"
            style={styles.pendingChip}
          >
            <Text variant="label" color="accentText">
              {toRespond.length}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {toRespond.length > 0 ? (
        <Pressable onPress={() => setView({ name: 'proposals' })} testID="calendar-pending-banner">
          <Banner tone="warning">
            {toRespond.length === 1 ? s.pending.one : s.pending.many(toRespond.length)}
          </Banner>
        </Pressable>
      ) : null}

      {awaitingMyPattern ? (
        <Banner tone="info">
          {s.awaitingPattern(parentName(otherIndex, household, members))}
        </Banner>
      ) : null}

      {!hasPattern && !pendingPattern ? (
        <Card style={styles.empty}>
          <Text variant="heading">{s.empty.title}</Text>
          <Text variant="body" color="textSecondary">
            {s.empty.body}
          </Text>
          <Button
            title={s.empty.cta}
            onPress={() => setView({ name: 'pattern-setup' })}
            testID="calendar-setup-pattern"
          />
        </Card>
      ) : null}

      <View style={styles.monthNav}>
        <Button
          title="‹"
          variant="ghost"
          fullWidth={false}
          onPress={() => setMonth((m) => addMonths(m, -1))}
          testID="calendar-prev-month"
        />
        <Text variant="heading">{monthLabel(month)}</Text>
        <Button
          title="›"
          variant="ghost"
          fullWidth={false}
          onPress={() => setMonth((m) => addMonths(m, 1))}
          testID="calendar-next-month"
        />
      </View>

      <MonthGrid
        month={month}
        patterns={patterns}
        overrides={overrides}
        today={today}
        pendingDates={pendingDatesSet}
        eventCounts={eventCounts}
        onSelectDay={(date) => setView({ name: 'day', date })}
      />

      {hasPattern ? (
        <View style={styles.legend}>
          {[0, 1].map((idx) => (
            <View key={idx} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.colors[parentStrong(idx)] }]}
              />
              <Text variant="caption" color="textSecondary">
                {s.withParent(parentName(idx, household, members))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasPattern ? (
        <Button
          title={s.patternSetup.title}
          variant="ghost"
          disabled={pendingPattern}
          onPress={() => setView({ name: 'pattern-setup' })}
          testID="calendar-change-pattern"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  pendingChip: {
    minWidth: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  empty: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: theme.radius.sm },
});
