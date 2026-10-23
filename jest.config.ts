import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
    // Jest 28 does not implement Node's synchronous ESM loading. Transform the
    // real uuid modules for source tests; packed checks exercise native loading.
    '^.+/uuid/.+\\.js$': 'ts-jest',
  },
  globals: {
    'ts-jest': { tsconfig: { allowJs: true, checkJs: false } },
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid/|\\.pnpm/uuid@)'],
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
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};

export default config;
