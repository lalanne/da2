import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

interface Props {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/** Bottom tab bar. No navigator dependency — a controlled segmented switch. */
export function TabBar({ items, active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            testID={`tab-${item.key}`}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.tab}
          >
            <View style={styles.labelRow}>
              <Text variant="label" color={isActive ? 'accent' : 'textSecondary'}>
                {item.label}
              </Text>
              {item.badge ? (
                <View style={styles.badge}>
                  <Text variant="caption" color="accentText" style={styles.badgeText}>
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.underline, isActive && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: theme.minTouch + 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14 },
  underline: { height: 2, width: theme.spacing.xl, borderRadius: theme.radius.sm },
  underlineActive: { backgroundColor: theme.colors.accent },
});
