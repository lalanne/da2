import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Text } from '../../components';
import { strings } from '../../i18n/strings';
import {
  daysInMonth,
  segmentsForCalendarDay,
  startOfMonth,
  weekdayMonday0,
  type Segment,
} from '../../custody';
import type { DayOverrideProposal, PatternProposal } from '../../models/Custody';
import { parentTint } from './parents';

interface Props {
  /** Any date in the month to render. */
  month: string;
  patterns: PatternProposal[];
  overrides: DayOverrideProposal[];
  today: string;
  pendingDates: Set<string>;
  /** yyyy-mm-dd → number of events that day (spec 005). */
  eventCounts?: Map<string, number>;
  onSelectDay: (date: string) => void;
}

export function MonthGrid({
  month,
  patterns,
  overrides,
  today,
  pendingDates,
  eventCounts,
  onSelectDay,
}: Props) {
  const first = startOfMonth(month);
  const lead = weekdayMonday0(first);
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...daysInMonth(first),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={styles.grid}>
      <View style={styles.weekdayRow}>
        {strings.custody.weekdaysShort.map((wd, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text variant="caption" color="textFaint" align="center">
              {wd}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((date, di) => (
            <DayCell
              key={di}
              date={date}
              segments={date ? segmentsForCalendarDay(date, patterns, overrides) : []}
              isToday={date === today}
              hasPending={date != null && pendingDates.has(date)}
              eventCount={date != null ? (eventCounts?.get(date) ?? 0) : 0}
              onPress={onSelectDay}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function DayCell({
  date,
  segments,
  isToday,
  hasPending,
  eventCount,
  onPress,
}: {
  date: string | null;
  segments: Segment[];
  isToday: boolean;
  hasPending: boolean;
  eventCount: number;
  onPress: (date: string) => void;
}) {
  if (!date) return <View style={styles.cell} />;

  const dayNum = Number(date.slice(8, 10));
  const dots = Math.min(eventCount, 3);

  return (
    <Pressable
      style={styles.cell}
      onPress={() => onPress(date)}
      accessibilityRole="button"
      testID={`day-${date}`}
    >
      <View style={[styles.cellInner, isToday && styles.today]}>
        <View style={StyleSheet.absoluteFill}>
          {segments.length === 0 ? null : (
            <View style={styles.fill}>
              {segments.map((s, i) => (
                <View
                  key={i}
                  style={{
                    flex: s.toMin - s.fromMin,
                    backgroundColor: theme.colors[parentTint(s.parentIndex)],
                  }}
                />
              ))}
            </View>
          )}
        </View>
        <Text variant="caption" style={styles.dayNum}>
          {dayNum}
        </Text>
        <View style={styles.markers}>
          {hasPending ? <View style={styles.pendingDot} /> : null}
          {Array.from({ length: dots }).map((_, i) => (
            <View key={i} style={styles.eventDot} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: theme.spacing.xs },
  weekdayRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, paddingVertical: theme.spacing.xs },
  week: { flexDirection: 'row', gap: theme.spacing.xs },
  cell: { flex: 1, aspectRatio: 1 },
  cellInner: {
    flex: 1,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { flex: 1, flexDirection: 'row' },
  today: { borderWidth: 2, borderColor: theme.colors.accent },
  dayNum: { fontWeight: '600' },
  markers: {
    position: 'absolute',
    bottom: 3,
    flexDirection: 'row',
    gap: 2,
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.textPrimary,
  },
});
