import { StyleSheet, View } from 'react-native';
import { theme, type ThemeColor } from '../theme';
import { Text } from './Text';

type Tone = 'info' | 'warning' | 'danger' | 'success';

interface Props {
  children: string;
  tone?: Tone;
  testID?: string;
}

const TONES: Record<Tone, { bg: ThemeColor; text: ThemeColor }> = {
  info: { bg: 'accentSoft', text: 'accentPressed' },
  warning: { bg: 'warningBg', text: 'warning' },
  danger: { bg: 'dangerBg', text: 'danger' },
  success: { bg: 'successBg', text: 'success' },
};

/** Inline status / info / error block. */
export function Banner({ children, tone = 'info', testID }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors[t.bg] }]} testID={testID}>
      <Text variant="caption" color={t.text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
