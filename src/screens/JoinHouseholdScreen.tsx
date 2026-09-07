import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Banner, Button, Screen, Text, TextField } from '../components';

export function JoinHouseholdScreen({ onBack }: { onBack: () => void }) {
  const { joinHousehold, isSubmitting, actionError, clearActionError } = useHouseholdStore();
  const [code, setCode] = useState('');

  const s = strings.household.join;

  const onChange = (text: string) => {
    if (actionError) clearActionError();
    // Keep the raw text — the store normalizes and validates on submit.
    setCode(text);
  };

  const onSubmit = async () => {
    await joinHousehold(code);
    // On success the profile listener flips the app to the main screen.
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">{s.title}</Text>
        <Text variant="body" color="textSecondary">
          {s.subtitle}
        </Text>
      </View>

      <TextField
        label={s.codeLabel}
        value={code}
        onChangeText={onChange}
        placeholder={s.codePlaceholder}
        autoCapitalize="characters"
        testID="invite-code-input"
      />

      {actionError ? (
        <Banner tone="danger" testID="join-household-error">
          {actionError}
        </Banner>
      ) : null}

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Button
          title={s.submit}
          onPress={onSubmit}
          loading={isSubmitting}
          testID="join-household-submit"
        />
        <Button
          title={strings.common.cancel}
          variant="ghost"
          onPress={onBack}
          testID="join-household-back"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  spacer: { flex: 1 },
  actions: { gap: theme.spacing.sm },
});
