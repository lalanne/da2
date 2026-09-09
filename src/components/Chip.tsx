import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

interface Props {
  label: string;
  /** Highlighted state. Ignored (always tinted) for a static chip. */
  selected?: boolean;
  /** Omit for a static display chip — no tap target, always in the accent tint. */
  onPress?: () => void;
  testID?: string;
}

/**
 * Small pill for filter rows and multi-select — receipt tags, month filter
 * (spec 007). Interactive selected state matches the segmented control:
 * `accentSoft` fill + `accent` border and text.
 */
export function Chip({ label, selected = false, onPress, testID }: Props) {
  if (onPress == null) {
    return (
      <View style={[styles.base, styles.static]} testID={testID}>
        <Text variant="label" color="accent">
          {label}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        styles.interactive,
        selected ? styles.selected : styles.unselected,
        pressed && { backgroundColor: theme.colors.pressedOverlay },
      ]}
    >
      <Text variant="label" color={selected ? 'accent' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactive: { minHeight: theme.minTouch },
  unselected: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  selected: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  static: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentSoft },
});
