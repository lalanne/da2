import { Platform, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

interface Props {
  code: string;
  testID?: string;
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** The invite code — large, selectable (long-press to copy), on a sunken well. */
export function CodeChip({ code, testID }: Props) {
  return (
    <View style={styles.well}>
      <Text
        selectable
        align="center"
        style={styles.code}
        testID={testID}
        accessibilityLabel={code.split('').join(' ')}
      >
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  code: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: 6,
    fontFamily: MONO,
    color: theme.colors.textPrimary,
  },
});
