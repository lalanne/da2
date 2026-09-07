import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme, type ThemeColor } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VARIANTS: Record<
  Variant,
  { bg: ThemeColor; bgPressed: ThemeColor; text: ThemeColor; border?: ThemeColor }
> = {
  primary: { bg: 'accent', bgPressed: 'accentPressed', text: 'accentText' },
  secondary: { bg: 'surface', bgPressed: 'surfaceSunken', text: 'textPrimary', border: 'border' },
  ghost: { bg: 'transparent', bgPressed: 'accentSoft', text: 'accent' },
  danger: { bg: 'dangerBg', bgPressed: 'dangerBg', text: 'danger' },
};

/** Replaces RN's `<Button>` (spec 007). Min 44pt tall, visible pressed state. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  testID,
}: Props) {
  const v = VARIANTS[variant];
  const isInert = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: theme.colors[pressed && !isInert ? v.bgPressed : v.bg],
          borderColor: v.border ? theme.colors[v.border] : theme.colors.transparent,
          borderWidth: v.border ? StyleSheet.hairlineWidth : 0,
        },
        isInert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors[v.text]} testID={testID ? `${testID}-loading` : undefined} />
      ) : (
        <Text variant="label" color={v.text} style={styles.label}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.minTouch + 4,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  inert: { opacity: 0.5 },
  label: { fontSize: 16 },
});
