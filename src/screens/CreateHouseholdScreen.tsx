import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { strings } from '../i18n/strings';
import { validateNewHousehold, type ChildRow } from './createHouseholdForm';

export function CreateHouseholdScreen({ onBack }: { onBack: () => void }) {
  const { createHousehold, isSubmitting } = useHouseholdStore();
  const [name, setName] = useState('');
  const [children, setChildren] = useState<ChildRow[]>([{ name: '', birthdate: '' }]);
  const [error, setError] = useState<string | null>(null);

  const s = strings.household.create;

  const updateChild = (index: number, patch: Partial<ChildRow>) => {
    setChildren((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onSubmit = async () => {
    const result = validateNewHousehold(name, children);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await createHousehold(result.value);
    // On success the profile listener flips the app to the main screen.
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{s.title}</Text>

      <Text style={styles.label}>{s.nameLabel}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={s.namePlaceholder}
        testID="household-name-input"
      />

      <Text style={styles.label}>{s.childrenLabel}</Text>
      {children.map((child, index) => (
        <View key={index} style={styles.childRow}>
          <TextInput
            style={styles.input}
            value={child.name}
            onChangeText={(text) => updateChild(index, { name: text })}
            placeholder={s.childNamePlaceholder}
            testID={`child-name-input-${index}`}
          />
          <TextInput
            style={styles.input}
            value={child.birthdate}
            onChangeText={(text) => updateChild(index, { birthdate: text })}
            placeholder={s.childBirthdatePlaceholder}
            autoCapitalize="none"
            testID={`child-birthdate-input-${index}`}
          />
          {children.length > 1 ? (
            <Button
              title={s.removeChild}
              onPress={() => setChildren((rows) => rows.filter((_, i) => i !== index))}
              testID={`remove-child-${index}`}
            />
          ) : null}
        </View>
      ))}
      <Button
        title={s.addChild}
        onPress={() => setChildren((rows) => [...rows, { name: '', birthdate: '' }])}
        testID="add-child-button"
      />

      {error ? (
        <Text style={styles.error} testID="create-household-error">
          {error}
        </Text>
      ) : null}

      {isSubmitting ? (
        <ActivityIndicator testID="create-household-spinner" />
      ) : (
        <Button title={s.submit} onPress={onSubmit} testID="create-household-submit" />
      )}
      <Button title={strings.common.cancel} onPress={onBack} testID="create-household-back" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  childRow: { gap: 8, marginBottom: 8 },
  error: { color: '#c0392b', textAlign: 'center' },
});
