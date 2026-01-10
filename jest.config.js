module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/protos/**.proto',
  ],
  coverageThreshold: {
    global: {
      branches: 13,
      functions: 15,
      lines: 20,
      statements: 20,
    },
  },
  verbose: true,
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  setupFilesAfterEnv: ['./jest.mock.ts'],
};
