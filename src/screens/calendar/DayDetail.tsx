import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { formatMinutes, segmentsForCalendarDay } from '../../custody';
import type { DayOverrideProposal, PatternProposal, Proposal } from '../../models/Custody';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { parentName, parentStrong } from './parents';
import { describeProposal, weekdayDayLabel } from './labels';

interface Props {
  date: string;
  patterns: PatternProposal[];
  overrides: DayOverrideProposal[];
  pendingForDate: Proposal[];
  household: Household;
  members: HouseholdMember[];
  onPropose: () => void;
  onBack: () => void;
}

export function DayDetail({
  date,
  patterns,
  overrides,
  pendingForDate,
  household,
  members,
  onPropose,
  onBack,
}: Props) {
  const segments = segmentsForCalendarDay(date, patterns, overrides);
  const s = strings.custody;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">{weekdayDayLabel(date)}</Text>
      </View>

      {pendingForDate.map((p) => (
        <Banner key={p.id} tone="warning">
          {describeProposal(p, household, members)}
        </Banner>
      ))}

      {segments.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {s.day.noPattern}
        </Text>
      ) : (
        <Card style={styles.section}>
          {segments.map((seg, i) => {
            const name = parentName(seg.parentIndex, household, members);
            const whole = seg.fromMin === 0 && seg.toMin === 1440;
            const when = whole
              ? s.day.allDay
              : seg.fromMin === 0
                ? s.day.untilTime(formatMinutes(seg.toMin))
                : seg.toMin === 1440
                  ? s.day.fromTime(formatMinutes(seg.fromMin))
                  : `${formatMinutes(seg.fromMin)}–${formatMinutes(seg.toMin)}`;
            return (
              <View key={i} style={styles.segRow}>
                <View
                  style={[styles.swatch, { backgroundColor: theme.colors[parentStrong(seg.parentIndex)] }]}
                />
                <View style={styles.segText}>
                  <Text variant="body">{s.withParent(name)}</Text>
                  <Text variant="caption" color="textSecondary">
                    {when}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <View style={styles.spacer} />
      <Button title={s.day.propose} onPress={onPropose} testID="day-propose-button" />
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.md },
  section: { gap: theme.spacing.md },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  swatch: { width: 14, height: 14, borderRadius: theme.radius.sm },
  segText: { gap: theme.spacing.xs },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
