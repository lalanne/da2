import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, ListRow, Screen, Text, WebDialog } from '../../components';
import { useWideWeb } from '../../web/useWideWeb';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useCustodyStore } from '../../store/custodyStore';
import { useEventsStore } from '../../store/eventsStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSplitStore } from '../../store/splitStore';
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
import { eventCountsByDate, eventsForDay, upcomingOccurrences } from '../../events';
import { formatAmount } from '../../receipts';
import { DEFAULT_CURRENCY } from '../../models/Receipt';
import { ABSENT_CO_PARENT, isSoloHousehold } from '../../models/Household';
import { computeBalanceSegments, isProvisional, needsReview } from '../../solo';
import type { KidEvent } from '../../models/Event';
import { MonthGrid } from './MonthGrid';
import { DayDetail } from './DayDetail';
import { ProposeOverride } from './ProposeOverride';
import { PatternSetup } from './PatternSetup';
import { ProposalsList } from './ProposalsList';
import { EventDetail } from '../events/EventDetail';
import { EventForm } from '../events/EventForm';
import { childrenLabel, eventTimeLabel } from '../events/labels';
import { describeProposal, dayLabel, monthLabel } from './labels';
import { parentName, parentStrong } from './parents';

type CalView =
  | { name: 'calendar' }
  | { name: 'day'; date: string }
  | { name: 'propose'; date: string }
  | { name: 'pattern-setup' }
  | { name: 'proposals' }
  | { name: 'event'; event: KidEvent; from: string }
  | { name: 'event-edit'; event: KidEvent; from: string };

const RAIL_HORIZON_DAYS = 90;
const RAIL_EVENT_LIMIT = 4;

interface Props {
  /** Spec 012: lets the wide-web side rail jump to another tab. Unused on native/narrow. */
  onOpenTab?: (tab: 'events' | 'receipts' | 'household') => void;
}

export function CalendarTab({ onOpenTab }: Props) {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const custody = useCustodyStore();
  const proposals = custody.proposals;
  const events = useEventsStore((s) => s.events);
  const eventsSubmitting = useEventsStore((s) => s.isSubmitting);
  const shared = useReceiptsStore((s) => s.shared);
  const settlements = useSplitStore((s) => s.settlements);

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
  const wideWeb = useWideWeb();
  const railUpcoming = useMemo(
    () => upcomingOccurrences(events, today, RAIL_HORIZON_DAYS, RAIL_EVENT_LIMIT),
    [events, today],
  );
  // Spec 015: pairs the sole parent's uid with the ABSENT_CO_PARENT sentinel
  // while solo, so solo-period settlements are counted — computeBalance()
  // alone would silently drop them (their payer/payee never matches
  // `parentIds[1] === undefined`).
  const balanceSegments = useMemo(() => {
    if (!household || !household.parentIds[0]) return null;
    const [a, b] = household.parentIds;
    return computeBalanceSegments(
      shared,
      settlements,
      [a, b ?? ABSENT_CO_PARENT],
      household.coParentJoinedAt,
    );
  }, [shared, settlements, household]);
  const balance = balanceSegments
    ? {
        netAOwesB:
          (balanceSegments.solo?.netAOwesB ?? 0) + balanceSegments.agreed.netAOwesB,
      }
    : null;
  const reviewQueue = useMemo(
    () => (uid ? needsReview(proposals, uid) : []),
    [proposals, uid],
  );

  if (!household || !uid) return null;
  const s = strings.custody;
  const otherIndex = Math.max(0, household.parentIds.findIndex((id) => id !== uid));
  const awaitingMyPattern =
    !patterns.length && pendingPattern && !toRespond.some((p) => p.type === 'pattern');

  // Spec 012: every "push" view (day detail, propose, pattern setup, the
  // proposals list, an event and its edit form) renders identically on
  // every platform — only WHERE it mounts differs (full-screen vs. a
  // WebDialog over the still-visible calendar on a wide web window).
  function renderPush(): ReactElement | null {
    if (view.name === 'proposals') {
      return (
        <ProposalsList
          proposals={proposals}
          currentUid={uid!}
          household={household!}
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
          household={household!}
          members={members}
          isSubmitting={custody.isSubmitting}
          onSubmit={async (input) => {
            const ok = await custody.proposePattern(input, isSoloHousehold(household!));
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
            household={household!}
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
          household={household!}
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
          household={household!}
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
          household={household!}
          members={members}
          isSubmitting={custody.isSubmitting}
          onSubmit={async (input) => {
            const ok = await custody.proposeDayOverride(input, isSoloHousehold(household!));
            if (ok) setView({ name: 'calendar' });
            return ok;
          }}
          onBack={() => setView({ name: 'day', date: view.date })}
        />
      );
    }

    return null;
  }

  const pushContent = renderPush();

  if (!wideWeb && pushContent) {
    return pushContent;
  }

  const hasPattern = patterns.length > 0;
  // Spec 015 — the pattern currently governing the calendar, and whether
  // it's a self-approved decision from the solo period the co-parent (now
  // present) hasn't accepted yet.
  const activePattern = [...patterns].sort((x, y) => y.createdAt - x.createdAt)[0] ?? null;
  const patternProvisional = activePattern ? isProvisional(activePattern) : false;
  const canReviewPattern = patternProvisional && activePattern?.proposerId !== uid;

  const base = (
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

      {patternProvisional ? (
        <View style={styles.provisionalRow} testID="calendar-provisional-badge">
          <Text variant="caption" color="warning">
            {strings.solo.provisionalBadge}
          </Text>
        </View>
      ) : null}

      {canReviewPattern ? (
        <View style={styles.provisionalActions}>
          <Button
            title={strings.solo.review.accept}
            variant="secondary"
            onPress={() => void custody.acknowledge(activePattern!.id)}
            disabled={custody.isSubmitting}
            testID="calendar-acknowledge-pattern"
          />
          <Button
            title={strings.solo.review.proposeDifferent}
            variant="ghost"
            onPress={() => setView({ name: 'pattern-setup' })}
            testID="calendar-propose-different-pattern"
          />
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

  if (!wideWeb) {
    return base;
  }

  // Spec 012: wide web gets a side rail — pending proposals (actionable),
  // upcoming events, and the balance — next to the calendar, plus push
  // views open as a WebDialog over it.
  const otherName = parentName(otherIndex, household, members);
  const [parentAId, parentBId] = household.parentIds;
  const iAmA = uid === parentAId;
  const youOwe = balance ? (iAmA ? balance.netAOwesB : -balance.netAOwesB) : 0;
  const b = strings.split.balance;
  const balanceLine =
    youOwe === 0 ? b.settled : youOwe > 0 ? b.youOwe(otherName, formatAmount(youOwe, DEFAULT_CURRENCY)) : b.owes(otherName, formatAmount(-youOwe, DEFAULT_CURRENCY));

  return (
    <View style={styles.wideRoot}>
      <View style={styles.wideMain}>{base}</View>
      <View style={styles.rail} testID="calendar-rail">
        {toRespond.length > 0 ? (
          <Card style={styles.railCard} testID="calendar-rail-pending">
            <Text variant="heading">{s.pending.listTitle}</Text>
            {toRespond.slice(0, 2).map((p) => (
              <View key={p.id} style={styles.railPendingItem}>
                <Text variant="body">{describeProposal(p, household, members)}</Text>
                <View style={styles.railPendingActions}>
                  <Button
                    title={strings.common.approve}
                    disabled={custody.isSubmitting}
                    onPress={() => void custody.resolve(p.id, 'approved')}
                    testID={`calendar-rail-approve-${p.id}`}
                  />
                  <Button
                    title={strings.common.reject}
                    variant="danger"
                    disabled={custody.isSubmitting}
                    onPress={() => void custody.resolve(p.id, 'rejected')}
                    testID={`calendar-rail-reject-${p.id}`}
                  />
                </View>
              </View>
            ))}
            {toRespond.length > 2 ? (
              <Button
                title={s.pending.review}
                variant="ghost"
                onPress={() => setView({ name: 'proposals' })}
                testID="calendar-rail-view-proposals"
              />
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.railCard} testID="calendar-rail-upcoming">
          <Text variant="heading">{s.rail.upcomingTitle}</Text>
          {railUpcoming.length === 0 ? (
            <Text variant="body" color="textSecondary">
              {s.rail.noUpcoming}
            </Text>
          ) : (
            railUpcoming.map(({ event, date }) => (
              <ListRow
                key={`${event.id}-${date}`}
                title={event.title}
                subtitle={`${dayLabel(date)} · ${eventTimeLabel(event)} · ${childrenLabel(event.childIds, household)}`}
                onPress={() => onOpenTab?.('events')}
                testID={`calendar-rail-event-${event.id}`}
              />
            ))
          )}
          <Button
            title={s.rail.viewEvents}
            variant="ghost"
            onPress={() => onOpenTab?.('events')}
            testID="calendar-rail-view-events"
          />
        </Card>

        {balance ? (
          <Card style={styles.railCard} testID="calendar-rail-balance">
            <Text variant="display" align="center" testID="calendar-rail-balance-line">
              {youOwe === 0 ? b.settled : formatAmount(Math.abs(youOwe), DEFAULT_CURRENCY)}
            </Text>
            {youOwe !== 0 ? (
              <Text variant="caption" color="textSecondary" align="center">
                {balanceLine}
              </Text>
            ) : null}
            <Button
              title={s.rail.viewReceipts}
              variant="ghost"
              onPress={() => onOpenTab?.('receipts')}
              testID="calendar-rail-view-receipts"
            />
          </Card>
        ) : null}

        {reviewQueue.length > 0 ? (
          <Card style={styles.railCard} testID="calendar-rail-review">
            <Text variant="heading">{strings.solo.review.title}</Text>
            <Text variant="body" color="textSecondary">
              {strings.solo.review.count(reviewQueue.length)}
            </Text>
            <Button
              title={strings.solo.review.title}
              variant="ghost"
              onPress={() => onOpenTab?.('household')}
              testID="calendar-rail-view-review"
            />
          </Card>
        ) : null}
      </View>

      <WebDialog
        visible={!!pushContent}
        onRequestClose={() => setView({ name: 'calendar' })}
        testID="calendar-dialog"
      >
        {pushContent}
      </WebDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  wideRoot: { flex: 1, flexDirection: 'row' },
  wideMain: { flex: 1 },
  rail: {
    width: 320,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  railCard: { gap: theme.spacing.sm },
  railPendingItem: { gap: theme.spacing.xs },
  railPendingActions: { flexDirection: 'row', gap: theme.spacing.sm },
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
  provisionalRow: { marginTop: theme.spacing.sm },
  provisionalActions: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: theme.radius.sm },
});
