import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useWideWeb, WIDE_WEB_BREAKPOINT } from '../useWideWeb';

// RN's index exports `useWindowDimensions` as a lazy getter that re-requires
// this file on every access — mocking it here (before useWideWeb.ts is
// imported, since jest.mock calls are hoisted) is what actually reaches the
// hook, unlike spying on the `react-native` module object directly.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 320, height: 800, scale: 1, fontScale: 1 })),
}));

import useWindowDimensionsMock from 'react-native/Libraries/Utilities/useWindowDimensions';

const originalOS = Platform.OS;
const mockedDimensions = useWindowDimensionsMock as jest.Mock;

function mockWidth(width: number) {
  mockedDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('useWideWeb', () => {
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('is true on web at or above the breakpoint', async () => {
    Platform.OS = 'web';
    mockWidth(WIDE_WEB_BREAKPOINT);
    const { result } = await renderHook(() => useWideWeb());
    expect(result.current).toBe(true);
  });

  it('is false on web below the breakpoint', async () => {
    Platform.OS = 'web';
    mockWidth(WIDE_WEB_BREAKPOINT - 1);
    const { result } = await renderHook(() => useWideWeb());
    expect(result.current).toBe(false);
  });

  it('is false on native even at a wide width', async () => {
    Platform.OS = 'ios';
    mockWidth(1280);
    const { result } = await renderHook(() => useWideWeb());
    expect(result.current).toBe(false);
  });
});
