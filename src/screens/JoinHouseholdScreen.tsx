import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../data/inviteCode';
import { strings } from '../i18n/strings';

export function JoinHouseholdScreen({ onBack }: { onBack: () => void }) {
  const { joinHousehold, isSubmitting, actionError, clearActionError } = useHouseholdStore();
  const [code, setCode] = useState('');

  const s = strings.household.join;

  const onChange = (text: string) => {
    if (actionError) clearActionError();
    setCode(normalizeInviteCode(text).slice(0, INVITE_CODE_LENGTH));
  };

  const onSubmit = async () => {
    await joinHousehold(code);
    // On success the profile listener flips the app to the main screen.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.label}>{s.codeLabel}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={onChange}
        placeholder={s.codePlaceholder}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        testID="invite-code-input"
      />

      {actionError ? (
        <Text style={styles.error} testID="join-household-error">
          {actionError}
        </Text>
      ) : null}

      {isSubmitting ? (
        <ActivityIndicator testID="join-household-spinner" />
      ) : (
        <Button title={s.submit} onPress={onSubmit} testID="join-household-submit" />
      )}
      <Button title={strings.common.cancel} onPress={onBack} testID="join-household-back" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: { color: '#c0392b', textAlign: 'center' },
});
