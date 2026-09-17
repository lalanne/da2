// jest-expo renders React Native's <Modal> as nothing, so any component that
// puts real UI inside a <Modal> (e.g. TimeField's bottom sheet, spec 009) is
// invisible to the tests. Render the children inline when `visible`.
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const MockModal = ({ visible = true, children }) =>
    visible ? React.createElement(React.Fragment, null, children) : null;
  return { __esModule: true, default: MockModal };
});

// The library's own jest mock only sets a default export; spread it so
// named imports (`import { useSafeAreaInsets } from '...'`, used throughout
// this codebase) resolve too, not just a default-style import.
jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...require('react-native-safe-area-context/jest/mock').default,
}));
