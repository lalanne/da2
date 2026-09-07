import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text, TextField } from '../../components';
import { strings } from '../../i18n/strings';
import { todayInTimezone } from '../../custody';
import type { NewPatternInput, PresetLabel } from '../../models/Custody';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { parentName } from './parents';
import { buildPatternInput } from './forms';

interface Props {
  household: Household;
  members: HouseholdMember[];
  isSubmitting: boolean;
  onSubmit: (input: NewPatternInput) => Promise<boolean>;
  onBack: () => void;
}

const PRESETS: PresetLabel[] = ['alternating-weeks', 'every-other-weekend', '2-2-3'];

export function PatternSetup({ household, members, isSubmitting, onSubmit, onBack }: Props) {
  const s = strings.custody.patternSetup;
  const todayIso = todayInTimezone(household.timezone);

  const [preset, setPreset] = useState<PresetLabel>('alternating-weeks');
  const [startsWith, setStartsWith] = useState(0);
  const [anchor, setAnchor] = useState(todayIso);
  const [changeover, setChangeover] = useState('18:00');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const result = buildPatternInput({
      preset,
      startsWith,
      anchorDate: anchor,
      changeoverTime: changeover,
      effectiveFrom,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await onSubmit(result.value);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">{s.title}</Text>
        <Text variant="body" color="textSecondary">
          {s.subtitle}
        </Text>
      </View>

      <View style={styles.block}>
        <Text variant="label">{s.presetLabel}</Text>
        {PRESETS.map((p) => {
          const active = preset === p;
          return (
            <Pressable
              key={p}
              testID={`preset-${p}`}
              onPress={() => setPreset(p)}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text variant="body" color={active ? 'accent' : 'textPrimary'}>
                {s.presets[p].name}
              </Text>
              <Text variant="caption" color="textSecondary">
                {s.presets[p].desc}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.block}>
        <Text variant="label">{s.residentialParent}</Text>
        <View style={styles.row}>
          {[0, 1].map((idx) => (
            <Pressable
              key={idx}
              testID={`starts-with-${idx}`}
              onPress={() => setStartsWith(idx)}
              style={[styles.chip, startsWith === idx && styles.chipActive]}
            >
              <Text variant="body" color={startsWith === idx ? 'accent' : 'textPrimary'}>
                {parentName(idx, household, members)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card style={styles.block}>
        <TextField
          label={s.anchorLabel}
          value={anchor}
          onChangeText={setAnchor}
          placeholder={s.datePlaceholder}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          testID="pattern-anchor"
        />
        <TextField
          label={s.changeoverLabel}
          value={changeover}
          onChangeText={setChangeover}
          placeholder="18:00"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          testID="pattern-changeover"
        />
        <TextField
          label={s.effectiveFromLabel}
          value={effectiveFrom}
          onChangeText={setEffectiveFrom}
          placeholder={s.datePlaceholder}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          testID="pattern-effective-from"
        />
      </Card>

      {error ? (
        <Banner tone="danger" testID="pattern-error">
          {error}
        </Banner>
      ) : null}

      <View style={styles.spacer} />
      <Button title={s.submit} onPress={submit} loading={isSubmitting} testID="pattern-submit" />
      <Button title={strings.common.cancel} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  block: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  preset: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  presetActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.minTouch,
    justifyContent: 'center',
  },
  chipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
