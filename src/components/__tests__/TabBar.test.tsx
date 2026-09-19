import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { TabBar } from '../TabBar';

const items = [
  { key: 'calendar', label: 'Calendario', icon: 'calendar' as const, badge: 3 },
  { key: 'events', label: 'Eventos', icon: 'events' as const },
  { key: 'receipts', label: 'Recibos', icon: 'receipts' as const },
  { key: 'household', label: 'Hogar', icon: 'household' as const },
];

// Regression: on a device with an on-screen Android nav bar (3-button mode),
// the OS reserves real space at the bottom of the screen. The bar rendered
// flush against it, so the OS buttons sat on top of "Recibos"/"Hogar" and
// Javiera couldn't tap them during pilot testing — reported from a photo of
// her phone showing the nav bar overlapping the tab labels.
describe('TabBar', () => {
  it('pads for the bottom safe-area inset so system nav buttons cannot cover it', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 48 }}>
        <TabBar items={items} active="calendar" onChange={jest.fn()} testID="tab-bar" />
      </SafeAreaInsetsContext.Provider>,
    );

    const style = StyleSheet.flatten(screen.getByTestId('tab-bar').props.style);
    expect(style.paddingBottom).toBeGreaterThanOrEqual(48);
  });
  describe('floating pill (spec 007 amendment 2026-09-18)', () => {
    const renderBar = (active = 'calendar') =>
      render(
        <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <TabBar items={items} active={active} onChange={jest.fn()} testID="tab-bar" />
        </SafeAreaInsetsContext.Provider>,
      );

    it('floats as an inset, fully rounded pill instead of a full-bleed strip', async () => {
      await renderBar();

      const bar = StyleSheet.flatten(screen.getByTestId('tab-bar').props.style);
      expect(bar.paddingHorizontal).toBeGreaterThan(0);
      expect(bar.borderTopWidth).toBeUndefined();

      const pill = StyleSheet.flatten(screen.getByTestId('tab-bar-pill').props.style);
      expect(pill.borderRadius).toBeGreaterThanOrEqual(theme.radius.lg);
      expect(pill.backgroundColor).toBe(theme.colors.surface);
    });

    it('highlights only the active tab with the accent tint', async () => {
      await renderBar('events');

      const bg = (key: string) =>
        StyleSheet.flatten(screen.getByTestId(`tab-${key}`).props.style).backgroundColor;
      expect(bg('events')).toBe(theme.colors.accentTint);
      expect(bg('calendar')).not.toBe(theme.colors.accentTint);
      expect(bg('household')).not.toBe(theme.colors.accentTint);
    });

    it('draws an icon for every tab that names one, hidden from screen readers', async () => {
      await renderBar();

      for (const item of items) {
        const icon = screen.getByTestId(`tab-icon-${item.icon}`, { includeHiddenElements: true });
        expect(icon.props.accessibilityElementsHidden).toBe(true);
        expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
      }
    });

    it('tints the active icon accent and the rest textSecondary', async () => {
      await renderBar('receipts');

      const parts = (name: string) =>
        within(screen.getByTestId(`tab-icon-${name}`, { includeHiddenElements: true })).getAllByTestId(
          'tab-icon-part',
          { includeHiddenElements: true },
        );
      const colors = (name: string) =>
        parts(name).map((n) => {
          const st = StyleSheet.flatten(n.props.style);
          return st.backgroundColor !== theme.colors.transparent && st.backgroundColor
            ? st.backgroundColor
            : st.borderColor;
        });
      expect(new Set(colors('receipts'))).toEqual(new Set([theme.colors.accent]));
      expect(new Set(colors('calendar'))).toEqual(new Set([theme.colors.textSecondary]));
    });

    it('keeps the pending badge on the tab', async () => {
      await renderBar();

      expect(screen.getByText('3')).toBeTruthy();
    });

    it('still renders text-only items that name no icon', async () => {
      await render(
        <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <TabBar
            items={[{ key: 'x', label: 'Sin ícono' }]}
            active="x"
            onChange={jest.fn()}
          />
        </SafeAreaInsetsContext.Provider>,
      );

      expect(screen.getByText('Sin ícono')).toBeTruthy();
    });
  });
});
