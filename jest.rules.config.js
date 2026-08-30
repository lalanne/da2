module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/firebase/tests'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/firebase/tests/tsconfig.json' }],
  },
};
