import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

interface Props {
  /** Display name; the first letter is shown. Empty / null renders an empty slot. */
  name?: string | null;
  empty?: boolean;
}

export function Avatar({ name, empty = false }: Props) {
  if (empty || !name) {
    return <View style={[styles.base, styles.empty]} />;
  }
  return (
    <View style={[styles.base, styles.filled]}>
      <Text variant="label" color="accent">
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const SIZE = 34;

const styles = StyleSheet.create({
  base: {
    width: SIZE,
    height: SIZE,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: theme.colors.accentSoft },
  empty: {
    backgroundColor: theme.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
});
