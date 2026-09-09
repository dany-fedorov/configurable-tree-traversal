import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '/(tests|src)/.*.test(\\..+)?\\.ts$',
  moduleNameMapper: {
    '^@breadth-first-traversal/(.*)$':
      '<rootDir>/src/traversals/breadth-first-traversal/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@depth-first-traversal/(.*)$':
      '<rootDir>/src/traversals/depth-first-traversal/$1',
    '^@traversable-object-tree/(.*)$':
      '<rootDir>/src/traversable-tree-implementations/traversable-object-tree/$1',
    '^@rewrite-object/(.*)$': '<rootDir>/src/tools/rewrite-object/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};

export default config;
