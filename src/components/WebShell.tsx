import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Avatar } from './Avatar';
import { Emblem } from './Emblem';
import { Text } from './Text';
import type { TabItem } from './TabBar';
import { strings } from '../i18n/strings';
import { useAuthStore } from '../store/authStore';

interface Props {
  /** Same shape `TabBar` takes — a near drop-in replacement. */
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  children: ReactNode;
}

/**
 * Spec 012 — the sidebar that replaces the bottom TabBar on a wide web
 * window (`useWideWeb()`). Same destinations, same pending badge; the tab
 * content it hosts is the exact same screen component the mobile layout
 * uses, unmodified.
 */
export function WebShell({ items, active, onChange, children }: Props) {
  const { user, signOut } = useAuthStore();

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <Emblem size={28} />
        </View>

        <View style={styles.nav}>
          {items.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                testID={`web-nav-${tab.key}`}
                onPress={() => onChange(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <NavIcon tab={tab.key} active={isActive} />
                <Text variant="body" color={isActive ? 'accent' : 'textSecondary'} style={styles.navLabel}>
                  {tab.label}
                </Text>
                {tab.badge ? (
                  <View style={styles.badge}>
                    <Text variant="caption" color="accentText" style={styles.badgeText}>
                      {tab.badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <Pressable
          onPress={signOut}
          testID="web-nav-sign-out"
          style={styles.account}
          accessibilityRole="button"
        >
          <Avatar name={user?.displayName} />
          <Text variant="body" numberOfLines={1} style={styles.accountName}>
            {user?.displayName ?? strings.household.settings.you}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

function NavIcon({ tab, active }: { tab: string; active: boolean }) {
  const color = active ? theme.colors.accent : theme.colors.textSecondary;
  if (tab === 'calendar') {
    return (
      <View style={[icon.calendar, { borderColor: color }]}>
        <View style={[icon.calendarTop, { backgroundColor: color }]} />
      </View>
    );
  }
  if (tab === 'events') {
    return (
      <View style={[icon.clock, { borderColor: color }]}>
        <View style={[icon.clockHand, { backgroundColor: color }]} />
      </View>
    );
  }
  if (tab === 'receipts') {
    return (
      <View style={[icon.receipt, { borderColor: color }]}>
        <View style={[icon.receiptLine, { backgroundColor: color }]} />
        <View style={[icon.receiptLine, { backgroundColor: color, width: 8 }]} />
      </View>
    );
  }
  return (
    <View style={icon.home}>
      <View style={[icon.roof, { borderBottomColor: color }]} />
      <View style={[icon.base, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 232,
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  brand: { paddingHorizontal: theme.spacing.sm, marginBottom: theme.spacing.lg },
  nav: { gap: theme.spacing.xs },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    minHeight: theme.minTouch,
  },
  navItemActive: { backgroundColor: theme.colors.accentSoft },
  navLabel: { flex: 1 },
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
  spacer: { flex: 1 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  accountName: { flex: 1 },
  content: { flex: 1, overflow: 'hidden' },
});

const icon = StyleSheet.create({
  calendar: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5 },
  calendarTop: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  clock: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHand: { width: 1.5, height: 6, marginBottom: 3, marginRight: 2 },
  receipt: {
    width: 15,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  receiptLine: { width: 8, height: 1.5, borderRadius: 1 },
  home: { width: 18, height: 18, alignItems: 'center', justifyContent: 'flex-end' },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  base: { width: 14, height: 8, borderWidth: 1.5, borderTopWidth: 0 },
});
