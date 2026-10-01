module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/firebase/', '<rootDir>/e2e/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
