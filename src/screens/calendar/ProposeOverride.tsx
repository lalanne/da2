import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text, TimeField } from '../../components';
import { strings } from '../../i18n/strings';
import type { NewDayOverrideInput } from '../../models/Custody';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { parentName, parentStrong } from './parents';
import { weekdayDayLabel } from './labels';
import { buildOverrideInput } from './forms';

interface Props {
  date: string;
  household: Household;
  members: HouseholdMember[];
  isSubmitting: boolean;
  onSubmit: (input: NewDayOverrideInput) => Promise<boolean>;
  onBack: () => void;
}

export function ProposeOverride({ date, household, members, isSubmitting, onSubmit, onBack }: Props) {
  const s = strings.custody.proposeOverride;
  const [assignedTo, setAssignedTo] = useState(0);
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const result = buildOverrideInput({ date, assignedTo, allDay, from, to });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await onSubmit(result.value);
  };

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {s.title(weekdayDayLabel(date))}
      </Text>

      <View style={styles.block}>
        <Text variant="label">{s.whoQuestion}</Text>
        <View style={styles.choices}>
          {[0, 1].map((idx) => {
            const active = assignedTo === idx;
            return (
              <Pressable
                key={idx}
                testID={`propose-parent-${idx}`}
                onPress={() => setAssignedTo(idx)}
                style={[styles.choice, active && styles.choiceActive]}
              >
                <View
                  style={[styles.dot, { backgroundColor: theme.colors[parentStrong(idx)] }]}
                />
                <Text variant="body" color={active ? 'accent' : 'textPrimary'}>
                  {parentName(idx, household, members)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card>
        <Pressable
          style={styles.toggleRow}
          onPress={() => setAllDay((v) => !v)}
          testID="propose-allday-toggle"
        >
          <Text variant="body">{s.allDayToggle}</Text>
          <View style={[styles.check, allDay && styles.checkOn]}>
            {allDay ? <Text variant="caption" color="accentText">✓</Text> : null}
          </View>
        </Pressable>
        {!allDay ? (
          <View style={styles.times}>
            <View style={styles.timeCol}>
              <TimeField
                label={s.fromLabel}
                value={from || null}
                onChange={(v) => setFrom(v ?? '')}
                optional
                testID="propose-from"
              />
            </View>
            <View style={styles.timeCol}>
              <TimeField
                label={s.toLabel}
                value={to || null}
                onChange={(v) => setTo(v ?? '')}
                optional
                testID="propose-to"
              />
            </View>
          </View>
        ) : null}
      </Card>

      {error ? (
        <Banner tone="danger" testID="propose-error">
          {error}
        </Banner>
      ) : null}

      <View style={styles.spacer} />
      <Button
        title={s.submit}
        onPress={submit}
        loading={isSubmitting}
        testID="propose-submit"
      />
      <Button title={strings.common.cancel} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  block: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  choices: { gap: theme.spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minHeight: theme.minTouch,
  },
  choiceActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  dot: { width: 14, height: 14, borderRadius: theme.radius.pill },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.minTouch,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  times: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  timeCol: { flex: 1 },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
