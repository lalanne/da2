import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { TabIcon, type TabIconName } from './TabIcon';
import { Text } from './Text';

export interface TabItem {
  key: string;
  label: string;
  icon?: TabIconName;
  badge?: number;
}

interface Props {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  testID?: string;
}

/**
 * Bottom tab bar — a floating pill (spec 007, 2026-09-18 amendment). No
 * navigator dependency — a controlled segmented switch. It sits in flow, so
 * screen content ends above it rather than scrolling under. Pads for the
 * bottom safe-area inset itself (rather than relying on a parent) so an
 * Android on-screen nav bar can't sit on top of the labels — that overlap
 * made the bar untappable on a pilot phone in 3-button mode.
 */
export function TabBar({ items, active, onChange, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}
      testID={testID}
    >
      <View style={styles.pill} testID="tab-bar-pill">
        {items.map((item) => {
          const isActive = item.key === active;
          const color = isActive ? 'accent' : 'textSecondary';
          return (
            <Pressable
              key={item.key}
              testID={`tab-${item.key}`}
              onPress={() => onChange(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              {item.icon ? (
                <View style={styles.iconWrap}>
                  <TabIcon name={item.icon} color={color} />
                  {item.badge ? (
                    <View style={styles.badge}>
                      <Text variant="caption" color="accentText" style={styles.badgeText}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.labelRow}>
                <Text variant="caption" color={color} style={styles.label}>
                  {item.label}
                </Text>
                {!item.icon && item.badge ? (
                  <View style={styles.badge}>
                    <Text variant="caption" color="accentText" style={styles.badgeText}>
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const PILL_PADDING = theme.spacing.sm - 2;

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.bg,
  },
  pill: {
    flexDirection: 'row',
    gap: 2,
    padding: PILL_PADDING,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: theme.colors.textPrimary,
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  tab: {
    flex: 1,
    minHeight: theme.minTouch + theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: theme.radius.pill,
  },
  tabActive: { backgroundColor: theme.colors.accentTint },
  iconWrap: { position: 'relative' },
  label: { fontWeight: '600', fontSize: 11, lineHeight: 13 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  badge: {
    position: 'absolute',
    top: -theme.spacing.sm,
    right: -theme.spacing.sm - theme.spacing.xs,
    minWidth: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
