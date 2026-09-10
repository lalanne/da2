import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { strings } from '../i18n/strings';
import { formatCivilDate, formatMonthYear } from '../i18n/dates';
import { addMonths, monthGrid, startOfMonth, toDayNumber, todayInTimezone } from '../custody/dates';
import { Text } from './Text';

interface Props {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Allow clearing back to null. Otherwise `value` is always a date. */
  optional?: boolean;
  /** Inclusive `yyyy-mm-dd` bounds — days outside are shown disabled. */
  min?: string;
  max?: string;
  /** Household IANA timezone, for "today". Defaults to the device zone. */
  timezone?: string;
  testID?: string;
}

/**
 * Tap to expand an inline Monday-first month grid (spec 009). No keyboard,
 * no modal — the grid renders in normal layout flow below the field.
 */
export function DateField({ label, value, onChange, optional = false, min, max, timezone, testID }: Props) {
  const dt = strings.dateTime;
  const today = todayInTimezone(timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(value ?? today));

  const cells = useMemo(() => monthGrid(view), [view]);
  const outOfRange = (iso: string) =>
    (min != null && toDayNumber(iso) < toDayNumber(min)) ||
    (max != null && toDayNumber(iso) > toDayNumber(max));

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <Text variant="label">{label}</Text>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.field, open && styles.fieldOpen]}
        testID={testID ? `${testID}-field` : undefined}
      >
        <Text variant="body" color={value ? 'textPrimary' : 'textFaint'}>
          {value ? formatCivilDate(value) : dt.chooseDate}
        </Text>
        <CalendarGlyph />
      </Pressable>

      {open ? (
        <View style={styles.pop}>
          <View style={styles.head}>
            <Pressable
              onPress={() => setView((v) => addMonths(v, -1))}
              hitSlop={10}
              testID={testID ? `${testID}-prev` : undefined}
            >
              <Text variant="heading" color="textSecondary">‹</Text>
            </Pressable>
            <Text variant="label">{formatMonthYear(view)}</Text>
            <Pressable
              onPress={() => setView((v) => addMonths(v, 1))}
              hitSlop={10}
              testID={testID ? `${testID}-next` : undefined}
            >
              <Text variant="heading" color="textSecondary">›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {strings.custody.weekdaysShort.map((wd, i) => (
              <View key={i} style={styles.weekCell}>
                <Text variant="caption" color="textFaint" align="center">{wd}</Text>
              </View>
            ))}
          </View>

          {chunk(cells, 7).map((week, wi) => (
            <View key={wi} style={styles.week}>
              {week.map((cell) => {
                const selected = cell.iso === value;
                const isToday = !selected && cell.iso === today;
                const disabled = outOfRange(cell.iso);
                return (
                  <Pressable
                    key={cell.iso}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() => pick(cell.iso)}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    testID={testID ? `${testID}-day-${cell.iso}` : undefined}
                  >
                    <View style={[styles.cellInner, selected && styles.selected, isToday && styles.today]}>
                      <Text
                        variant="caption"
                        color={
                          selected
                            ? 'accentText'
                            : disabled || !cell.inMonth
                              ? 'textFaint'
                              : 'textPrimary'
                        }
                      >
                        {Number(cell.iso.slice(8, 10))}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.foot}>
            <Pressable
              onPress={() => {
                setView(startOfMonth(today));
                pick(today);
              }}
              hitSlop={10}
              testID={testID ? `${testID}-today` : undefined}
            >
              <Text variant="label" color="accent">{dt.today}</Text>
            </Pressable>
            {optional && value != null ? (
              <Pressable
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                hitSlop={10}
                testID={testID ? `${testID}-clear` : undefined}
              >
                <Text variant="label" color="textSecondary">{dt.clearDate}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function CalendarGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={styles.glyphTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  field: {
    minHeight: theme.minTouch + 6,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldOpen: { borderColor: theme.colors.accent },
  pop: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, paddingBottom: theme.spacing.xs },
  week: { flexDirection: 'row', gap: theme.spacing.xs },
  cell: { flex: 1, aspectRatio: 1 },
  cellInner: {
    flex: 1,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: theme.colors.accent },
  today: { borderWidth: 2, borderColor: theme.colors.accent },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  glyph: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  glyphTop: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: theme.colors.accent,
  },
});
