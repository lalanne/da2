import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { strings } from '../i18n/strings';
import { formatMinutes, minutesOfDay } from '../custody/dates';
import { Text } from './Text';

interface Props {
  label: string;
  value: string | null; // HH:mm, 24-hour; null = no time
  onChange: (value: string | null) => void;
  /** Offer a "Sin hora" row that emits null. */
  optional?: boolean;
  /** Grid spacing for the list. Default 15. */
  stepMinutes?: number;
  testID?: string;
}

const ROW_HEIGHT = 48;
const FALLBACK = '09:00';

/** Tap to open a bottom-sheet list of times (spec 009) — no keyboard. */
export function TimeField({ label, value, onChange, optional = false, stepMinutes = 15, testID }: Props) {
  const dt = strings.dateTime;
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const times = useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 1440; m += stepMinutes) out.push(formatMinutes(m));
    return out;
  }, [stepMinutes]);

  const nearestIndex = useMemo(() => {
    const target = minutesOfDay(value ?? FALLBACK);
    let best = 0;
    let bestDelta = Infinity;
    times.forEach((t, i) => {
      const delta = Math.abs(minutesOfDay(t) - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    return best;
  }, [times, value]);

  const rows: (string | null)[] = optional ? [null, ...times] : times;
  const selectedRow = optional ? nearestIndex + 1 : nearestIndex;

  const onSheetLayout = () => {
    // Centre the list roughly on the current value when the sheet opens.
    scrollRef.current?.scrollTo({ y: Math.max(0, (selectedRow - 2) * ROW_HEIGHT), animated: false });
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <Text variant="label">{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={styles.field}
        testID={testID ? `${testID}-field` : undefined}
      >
        <Text variant="body" color={value ? 'textPrimary' : 'textFaint'}>
          {value ?? dt.chooseTime}
        </Text>
        <ClockGlyph />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text variant="heading" align="center" style={styles.sheetTitle}>
            {dt.timeTitle}
          </Text>
          <ScrollView ref={scrollRef} style={styles.list} onLayout={onSheetLayout}>
            {rows.map((item, i) => {
              const selected = item === value;
              return (
                <View key={item ?? 'none'}>
                  {i > 0 ? <Separator /> : null}
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[styles.row, selected && styles.rowSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={testID ? `${testID}-opt-${item ?? 'none'}` : undefined}
                  >
                    <Text
                      variant="body"
                      color={selected ? 'accent' : item ? 'textPrimary' : 'textSecondary'}
                    >
                      {item ?? dt.noTime}
                    </Text>
                    {selected ? <Check /> : null}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ClockGlyph() {
  return (
    <View style={styles.clock}>
      <View style={styles.clockHand} />
    </View>
  );
}

function Check() {
  return <View style={styles.check} />;
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
  backdrop: { flex: 1, backgroundColor: theme.colors.pressedOverlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  sheetTitle: { paddingVertical: theme.spacing.sm },
  list: { borderTopWidth: 1, borderTopColor: theme.colors.hairline },
  row: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: { backgroundColor: theme.colors.accentSoft },
  separator: { height: 1, backgroundColor: theme.colors.hairline },
  clock: {
    width: 16,
    height: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHand: {
    width: 1.5,
    height: 5,
    backgroundColor: theme.colors.accent,
    marginBottom: 2,
    marginRight: 2,
  },
  check: {
    width: 12,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.colors.accent,
    transform: [{ rotate: '-45deg' }],
  },
});
