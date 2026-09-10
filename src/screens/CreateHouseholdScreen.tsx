import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Banner, Button, Card, DateField, Screen, Text, TextField } from '../components';
import { todayInTimezone } from '../custody';
import { validateNewHousehold, type ChildRow } from './createHouseholdForm';

export function CreateHouseholdScreen({ onBack }: { onBack: () => void }) {
  const { createHousehold, isSubmitting } = useHouseholdStore();
  const todayIso = todayInTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
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
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {s.title}
      </Text>

      <View style={styles.form}>
        <TextField
          label={s.nameLabel}
          value={name}
          onChangeText={setName}
          placeholder={s.namePlaceholder}
          testID="household-name-input"
        />

        <View style={styles.childrenBlock}>
          <Text variant="label">{s.childrenLabel}</Text>
          {children.map((child, index) => (
            <Card key={index}>
              <View style={styles.childRow}>
                <TextField
                  value={child.name}
                  onChangeText={(text) => updateChild(index, { name: text })}
                  placeholder={s.childNamePlaceholder}
                  testID={`child-name-input-${index}`}
                />
                <DateField
                  label={s.childBirthdatePlaceholder}
                  value={child.birthdate || null}
                  onChange={(birthdate) => updateChild(index, { birthdate: birthdate ?? '' })}
                  optional
                  max={todayIso}
                  testID={`child-birthdate-input-${index}`}
                />
                {children.length > 1 ? (
                  <Button
                    title={s.removeChild}
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => setChildren((rows) => rows.filter((_, i) => i !== index))}
                    testID={`remove-child-${index}`}
                  />
                ) : null}
              </View>
            </Card>
          ))}
          <Button
            title={s.addChild}
            variant="secondary"
            onPress={() => setChildren((rows) => [...rows, { name: '', birthdate: '' }])}
            testID="add-child-button"
          />
        </View>

        {error ? (
          <Banner tone="danger" testID="create-household-error">
            {error}
          </Banner>
        ) : null}
      </View>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Button
          title={s.submit}
          onPress={onSubmit}
          loading={isSubmitting}
          testID="create-household-submit"
        />
        <Button
          title={strings.common.cancel}
          variant="ghost"
          onPress={onBack}
          testID="create-household-back"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  form: { gap: theme.spacing.lg },
  childrenBlock: { gap: theme.spacing.sm },
  childRow: { gap: theme.spacing.sm },
  spacer: { minHeight: theme.spacing.xl, flexGrow: 1 },
  actions: { gap: theme.spacing.sm },
});
