import { Platform, useWindowDimensions } from 'react-native';

/** Below this, the app renders exactly as spec 011 shipped it (mobile). */
export const WIDE_WEB_BREAKPOINT = 960;

/**
 * True only on a web build at a wide-enough window (spec 012). Every native
 * build, and every narrow browser window, gets `false` — the entire wide-web
 * layout is additive on top of the proven mobile paths, never a replacement
 * for them. Reactive to resizing (`useWindowDimensions`).
 */
export function useWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_WEB_BREAKPOINT;
}
