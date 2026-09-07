import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string | null;
  placeholder?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  testID?: string;
}

/**
 * Labelled input + inline error. Deliberately omits `maxLength`,
 * `letterSpacing` and `textAlign` on the field — that combination on a
 * controlled input crashed iOS during spec 002.
 */
export function TextField({
  value,
  onChangeText,
  label,
  error,
  placeholder,
  autoCapitalize,
  autoComplete = 'off',
  autoCorrect = false,
  keyboardType,
  testID,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            borderColor: error
              ? theme.colors.danger
              : focused
                ? theme.colors.accent
                : theme.colors.borderStrong,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" color="danger" testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  label: { color: theme.colors.textPrimary },
  input: {
    minHeight: theme.minTouch + 6,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
});
