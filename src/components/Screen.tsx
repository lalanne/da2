import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
  /** Wrap content in a ScrollView (for forms / long content). */
  scroll?: boolean;
  /** Vertically centre the content (welcome / empty states). */
  center?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Safe-area frame with the app's standard page padding and background. */
export function Screen({ children, scroll, center, style, testID }: Props) {
  const contentStyle: StyleProp<ViewStyle> = [
    styles.content,
    Platform.OS === 'web' && styles.webCap,
    center && styles.center,
    style,
  ];

  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'web' && styles.webCap,
              center && styles.center,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={contentStyle}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  fill: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  center: { justifyContent: 'center' },
  // Spec 012: without this, content stretches edge-to-edge on a wide
  // browser window — the mobile layout was never designed for that width.
  webCap: { maxWidth: 720, width: '100%', alignSelf: 'center' },
});
