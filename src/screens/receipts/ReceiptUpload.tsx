import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text, TextField } from '../../components';
import { strings } from '../../i18n/strings';
import { todayInTimezone } from '../../custody';
import { buildReceiptInput, validatePickedFile, type ReceiptFormState } from '../../receipts';
import {
  pickFromCamera,
  pickFromLibrary,
  pickPdf,
  type PickResult,
} from '../../data/receiptPicker';
import {
  DEFAULT_CURRENCY,
  RECEIPT_CATEGORIES,
  type NewReceiptInput,
  type PickedFile,
} from '../../models/Receipt';
import type { Household } from '../../models/Household';
import { categoryLabel } from './labels';

interface Props {
  household: Household;
  isSubmitting: boolean;
  onSubmit: (file: PickedFile, meta: NewReceiptInput) => Promise<boolean>;
  onBack: () => void;
}

export function ReceiptUpload({ household, isSubmitting, onSubmit, onBack }: Props) {
  const u = strings.receipts.upload;
  const f = strings.receipts.form;
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const [state, setState] = useState<ReceiptFormState>({
    amount: '',
    currency: DEFAULT_CURRENCY,
    category: 'medical',
    expenseDate: todayInTimezone(household.timezone),
    note: '',
    childId: null,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<ReceiptFormState>) => setState((s) => ({ ...s, ...patch }));

  const handlePick = async (pick: () => Promise<PickResult>) => {
    setPickError(null);
    const res = await pick();
    if (!res.ok) {
      if (res.reason === 'permission') setPickError(u.errors.permission);
      return;
    }
    const valid = validatePickedFile(res.file);
    if (!valid.ok) {
      setPickError(valid.error);
      return;
    }
    setFile(res.file);
  };

  const submit = async () => {
    if (!file) return;
    const result = buildReceiptInput(state);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    await onSubmit(file, result.value);
  };

  if (!file) {
    return (
      <Screen>
        <Text variant="title" style={styles.title}>
          {u.title}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {u.pickSource}
        </Text>
        <View style={styles.sources}>
          <Button title={u.camera} onPress={() => void handlePick(pickFromCamera)} testID="pick-camera" />
          <Button
            title={u.library}
            variant="secondary"
            onPress={() => void handlePick(pickFromLibrary)}
            testID="pick-library"
          />
          <Button
            title={u.file}
            variant="secondary"
            onPress={() => void handlePick(pickPdf)}
            testID="pick-pdf"
          />
        </View>
        {pickError ? (
          <Banner tone="danger" testID="pick-error">
            {pickError}
          </Banner>
        ) : null}
        <View style={styles.spacer} />
        <Button title={strings.common.cancel} variant="ghost" onPress={onBack} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {u.title}
      </Text>

      <View style={styles.form}>
        <TextField
          label={f.amountLabel}
          value={state.amount}
          onChangeText={(amount) => set({ amount })}
          placeholder={f.amountPlaceholder}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          testID="receipt-amount"
        />

        <View style={styles.block}>
          <Text variant="label">{f.categoryLabel}</Text>
          <View style={styles.chips}>
            {RECEIPT_CATEGORIES.map((c) => {
              const active = state.category === c;
              return (
                <Pressable
                  key={c}
                  testID={`receipt-category-${c}`}
                  onPress={() => set({ category: c })}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text variant="caption" color={active ? 'accent' : 'textPrimary'}>
                    {categoryLabel(c)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={f.dateLabel}
          value={state.expenseDate}
          onChangeText={(expenseDate) => set({ expenseDate })}
          placeholder={f.datePlaceholder}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          testID="receipt-date"
        />

        {household.children.length > 0 ? (
          <View style={styles.block}>
            <Text variant="label">{f.childLabel}</Text>
            <View style={styles.chips}>
              <Pressable
                testID="receipt-child-none"
                onPress={() => set({ childId: null })}
                style={[styles.chip, state.childId === null && styles.chipActive]}
              >
                <Text variant="caption" color={state.childId === null ? 'accent' : 'textPrimary'}>
                  {f.noChild}
                </Text>
              </Pressable>
              {household.children.map((c) => {
                const active = state.childId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    testID={`receipt-child-${c.id}`}
                    onPress={() => set({ childId: c.id })}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text variant="caption" color={active ? 'accent' : 'textPrimary'}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <TextField
          label={f.noteLabel}
          value={state.note}
          onChangeText={(note) => set({ note })}
          testID="receipt-note"
        />

        {formError ? (
          <Banner tone="danger" testID="receipt-error">
            {formError}
          </Banner>
        ) : null}
      </View>

      <View style={styles.spacer} />
      <Button title={f.submit} onPress={submit} loading={isSubmitting} testID="receipt-submit" />
      <Button title={strings.common.cancel} variant="ghost" onPress={() => setFile(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.md },
  subtitle: { marginBottom: theme.spacing.lg },
  sources: { gap: theme.spacing.sm },
  form: { gap: theme.spacing.lg },
  block: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.minTouch - 8,
    justifyContent: 'center',
  },
  chipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
