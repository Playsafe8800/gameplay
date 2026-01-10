import type { Config } from '@jest/types';
import 'ts-node';
const config: Config.InitialOptions = {
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
  verbose: false,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  setupFilesAfterEnv: ['./jest.mock.ts'],
};

export default config;
