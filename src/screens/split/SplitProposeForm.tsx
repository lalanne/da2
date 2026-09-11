import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useSplitStore } from '../../store/splitStore';
import { buildSplitProposalInput, stepPercent, type SplitFormState } from '../../split';
import { RECEIPT_TAGS, type ReceiptTag } from '../../models/Receipt';
import type { SplitTable } from '../../models/Split';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { tagLabel } from '../receipts/labels';

interface Props {
  household: Household;
  members: HouseholdMember[];
  currentUid: string;
  /** Prefill from the active table, if any. */
  initial: SplitTable | null;
  onDone: () => void;
  onBack: () => void;
}

export function SplitProposeForm({ household, members, currentUid, initial, onDone, onBack }: Props) {
  const p = strings.split.propose;
  const store = useSplitStore();
  const [state, setState] = useState<SplitFormState>(() => ({
    defaultPercentA: initial?.defaultPercentA ?? 50,
    overrides: { ...(initial?.overrides ?? {}) },
  }));
  const [formError, setFormError] = useState<string | null>(null);

  const nameA = members.find((m) => m.uid === household.parentIds[0])?.displayName ?? 'A';
  const otherName =
    members.find((m) => m.uid !== currentUid)?.displayName ?? strings.custody.theOtherParent;

  const setDefault = (delta: number) =>
    setState((s) => ({ ...s, defaultPercentA: stepPercent(s.defaultPercentA, delta) }));
  const setOverride = (tag: ReceiptTag, delta: number) =>
    setState((s) => ({
      ...s,
      overrides: { ...s.overrides, [tag]: stepPercent(s.overrides[tag] ?? s.defaultPercentA, delta) },
    }));
  const addRule = (tag: ReceiptTag) =>
    setState((s) => ({ ...s, overrides: { ...s.overrides, [tag]: s.defaultPercentA } }));
  const removeRule = (tag: ReceiptTag) =>
    setState((s) => {
      const next = { ...s.overrides };
      delete next[tag];
      return { ...s, overrides: next };
    });

  const ruleTags = RECEIPT_TAGS.filter((t) => state.overrides[t] != null);
  const freeTags = useMemo(
    () => RECEIPT_TAGS.filter((t) => state.overrides[t] == null),
    [state.overrides],
  );

  const submit = async () => {
    const result = buildSplitProposalInput(state);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    const ok = await store.propose(result.value);
    if (ok) onDone();
  };

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {p.title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {p.subtitle(otherName)}
      </Text>

      <Card style={styles.card}>
        <Stepper
          label={strings.split.table.byDefault}
          percentA={state.defaultPercentA}
          nameA={nameA}
          onMinus={() => setDefault(-5)}
          onPlus={() => setDefault(5)}
          testID="split-default"
        />
        {ruleTags.map((t) => (
          <View key={t}>
            <View style={styles.divider} />
            <Stepper
              label={tagLabel(t)}
              percentA={state.overrides[t] ?? state.defaultPercentA}
              nameA={nameA}
              onMinus={() => setOverride(t, -5)}
              onPlus={() => setOverride(t, 5)}
              onRemove={() => removeRule(t)}
              testID={`split-rule-${t}`}
            />
          </View>
        ))}
      </Card>

      {freeTags.length > 0 ? (
        <View style={styles.addRow}>
          <Text variant="caption" color="textSecondary">
            {p.addRule}
          </Text>
          <View style={styles.chips}>
            {freeTags.map((t) => (
              <Pressable
                key={t}
                onPress={() => addRule(t)}
                style={styles.addChip}
                testID={`split-add-${t}`}
              >
                <Text variant="caption" color="accent">
                  ＋ {tagLabel(t)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {formError ?? store.actionError ? (
        <Banner tone="danger" testID="split-error">
          {formError ?? store.actionError ?? ''}
        </Banner>
      ) : null}

      <View style={styles.spacer} />
      <Button
        title={p.submit(otherName)}
        onPress={submit}
        loading={store.isSubmitting}
        testID="split-submit"
      />
      <Button title={strings.common.cancel} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function Stepper({
  label,
  percentA,
  nameA,
  onMinus,
  onPlus,
  onRemove,
  testID,
}: {
  label: string;
  percentA: number;
  nameA: string;
  onMinus: () => void;
  onPlus: () => void;
  onRemove?: () => void;
  testID: string;
}) {
  return (
    <View style={styles.stepRow} testID={testID}>
      <View style={styles.stepLabel}>
        <Text variant="body">{label}</Text>
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8} testID={`${testID}-remove`}>
            <Text variant="caption" color="textSecondary">
              {strings.split.propose.removeRule}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={onMinus} style={styles.stepBtn} testID={`${testID}-minus`}>
          <Text variant="heading" color="accent">
            −
          </Text>
        </Pressable>
        <Text variant="label" style={styles.stepVal}>
          {percentA} / {100 - percentA}
        </Text>
        <Pressable onPress={onPlus} style={styles.stepBtn} testID={`${testID}-plus`}>
          <Text variant="heading" color="accent">
            ＋
          </Text>
        </Pressable>
      </View>
      <Text variant="caption" color="textFaint">
        {nameA} {percentA}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.sm },
  subtitle: { marginBottom: theme.spacing.lg },
  card: { gap: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.hairline, marginVertical: theme.spacing.sm },
  stepRow: { gap: theme.spacing.xs },
  stepLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stepBtn: {
    width: theme.minTouch,
    height: theme.minTouch,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { minWidth: 72, textAlign: 'center' },
  addRow: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  addChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.minTouch,
    justifyContent: 'center',
  },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
