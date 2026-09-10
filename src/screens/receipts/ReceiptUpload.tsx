import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Chip, DateField, Screen, Text, TextField } from '../../components';
import { strings } from '../../i18n/strings';
import { todayInTimezone } from '../../custody';
import {
  buildReceiptInput,
  toggleReceiptTag,
  validatePickedFile,
  type ReceiptFormState,
} from '../../receipts';
import {
  pickFromCamera,
  pickFromLibrary,
  pickPdf,
  type PickResult,
} from '../../data/receiptPicker';
import {
  DEFAULT_CURRENCY,
  RECEIPT_TAGS,
  type NewReceiptInput,
  type PickedFile,
} from '../../models/Receipt';
import type { Household } from '../../models/Household';
import { tagLabel } from './labels';

interface Props {
  household: Household;
  isSubmitting: boolean;
  /** Store-level failure from the last upload attempt (rules denial, network, …). */
  submitError?: string | null;
  onSubmit: (file: PickedFile, meta: NewReceiptInput) => Promise<boolean>;
  onBack: () => void;
}

export function ReceiptUpload({ household, isSubmitting, submitError, onSubmit, onBack }: Props) {
  const u = strings.receipts.upload;
  const f = strings.receipts.form;
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const [state, setState] = useState<ReceiptFormState>({
    amount: '',
    currency: DEFAULT_CURRENCY,
    tags: [],
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
          <Text variant="label">{f.tagsLabel}</Text>
          <View style={styles.chips}>
            {RECEIPT_TAGS.map((t) => (
              <Chip
                key={t}
                testID={`receipt-tag-${t}`}
                label={tagLabel(t)}
                selected={state.tags.includes(t)}
                onPress={() => set({ tags: toggleReceiptTag(state.tags, t) })}
              />
            ))}
          </View>
          <Text variant="caption" color="textSecondary">
            {f.tagsHint}
          </Text>
        </View>

        <DateField
          label={f.dateLabel}
          value={state.expenseDate}
          onChange={(expenseDate) => set({ expenseDate: expenseDate ?? state.expenseDate })}
          timezone={household.timezone}
          testID="receipt-date"
        />

        {household.children.length > 0 ? (
          <View style={styles.block}>
            <Text variant="label">{f.childLabel}</Text>
            <View style={styles.chips}>
              <Chip
                testID="receipt-child-none"
                label={f.noChild}
                selected={state.childId === null}
                onPress={() => set({ childId: null })}
              />
              {household.children.map((c) => (
                <Chip
                  key={c.id}
                  testID={`receipt-child-${c.id}`}
                  label={c.name}
                  selected={state.childId === c.id}
                  onPress={() => set({ childId: c.id })}
                />
              ))}
            </View>
          </View>
        ) : null}

        <TextField
          label={f.noteLabel}
          value={state.note}
          onChangeText={(note) => set({ note })}
          testID="receipt-note"
        />

        {formError ?? submitError ? (
          <Banner tone="danger" testID="receipt-error">
            {formError ?? submitError ?? ''}
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
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
