import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  /** Dim the title (e.g. an empty slot). */
  muted?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  testID?: string;
}

/** One row in a list — household members, children, later receipts / events. */
export function ListRow({ title, subtitle, muted, leading, trailing, onPress, testID }: Props) {
  const body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text variant="body" color={muted ? 'textFaint' : 'textPrimary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: theme.colors.pressedOverlay },
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={styles.row} testID={testID}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.minTouch + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  leading: { flexShrink: 0 },
  text: { flex: 1, gap: theme.spacing.xs },
});
