import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  // RN's built-in SafeAreaView is deprecated in favour of
  // react-native-safe-area-context — but that's a native module and spec 007
  // must stay OTA-deployable, so we use the built-in until the pilot next
  // takes a native build.
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
            contentContainerStyle={[styles.scrollContent, center && styles.center]}
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
});
