import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import type { Proposal } from '../../models/Custody';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { parentName } from './parents';
import { describeProposal } from './labels';

interface Props {
  proposals: Proposal[];
  currentUid: string;
  household: Household;
  members: HouseholdMember[];
  isSubmitting: boolean;
  onResolve: (id: string, decision: 'approved' | 'rejected') => void;
  onCancel: (id: string) => void;
  onBack: () => void;
}

export function ProposalsList({
  proposals,
  currentUid,
  household,
  members,
  isSubmitting,
  onResolve,
  onCancel,
  onBack,
}: Props) {
  const s = strings.custody.pending;
  const pending = proposals.filter((p) => p.status === 'pending');

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {s.listTitle}
      </Text>

      {pending.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {s.none}
        </Text>
      ) : (
        pending.map((p) => {
          const mine = p.proposerId === currentUid;
          const proposerName = parentName(
            household.parentIds.indexOf(p.proposerId),
            household,
            members,
          );
          return (
            <Card key={p.id} style={styles.card} testID={`proposal-${p.id}`}>
              <Text variant="body">{describeProposal(p, household, members)}</Text>
              <Text variant="caption" color="textSecondary">
                {mine ? s.proposedByYou : s.proposedBy(proposerName)}
              </Text>
              <View style={styles.actions}>
                {mine ? (
                  <Button
                    title={strings.common.cancel}
                    variant="secondary"
                    disabled={isSubmitting}
                    onPress={() => onCancel(p.id)}
                    testID={`proposal-${p.id}-cancel`}
                  />
                ) : (
                  <>
                    <Button
                      title={strings.common.approve}
                      disabled={isSubmitting}
                      onPress={() => onResolve(p.id, 'approved')}
                      testID={`proposal-${p.id}-approve`}
                    />
                    <Button
                      title={strings.common.reject}
                      variant="danger"
                      disabled={isSubmitting}
                      onPress={() => onResolve(p.id, 'rejected')}
                      testID={`proposal-${p.id}-reject`}
                    />
                  </>
                )}
              </View>
            </Card>
          );
        })
      )}

      <View style={styles.spacer} />
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  card: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
