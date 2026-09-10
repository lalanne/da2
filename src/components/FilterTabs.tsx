import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

export interface FilterTabOption<T> {
  value: T;
  label: string;
}

interface Props<T> {
  options: ReadonlyArray<FilterTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * Single-select filter row rendered as scrollable underline tabs (spec 007) —
 * the receipt list's tag and month filters. Values are compared with `===`,
 * so `T` must be a primitive (string, `null`, …).
 */
export function FilterTabs<T>({ options, value, onChange, testID }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID={testID}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ top: 10, bottom: 10 }}
            style={[styles.tab, selected && styles.tabSelected]}
            testID={testID ? `${testID}-${String(o.value)}` : undefined}
          >
            <Text variant="label" color={selected ? 'accent' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
      {/* trailing spacer so the last tab clears the screen edge */}
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.md,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.transparent,
    marginBottom: -1,
  },
  tabSelected: { borderBottomColor: theme.colors.accent },
  tail: { width: theme.spacing.xs },
});
