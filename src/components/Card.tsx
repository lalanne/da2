import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
  /** Use the sunken surface colour and no border (e.g. the code chip's inner well). */
  sunken?: boolean;
  /** Remove the default inner padding (for a card that only holds list rows). */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Surface container: radius, hairline border, standard padding. */
export function Card({ children, sunken = false, flush = false, style, testID }: Props) {
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: sunken ? theme.colors.surfaceSunken : theme.colors.surface,
          borderWidth: sunken ? 0 : StyleSheet.hairlineWidth,
        },
        !flush && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  padded: { padding: theme.spacing.lg },
});
