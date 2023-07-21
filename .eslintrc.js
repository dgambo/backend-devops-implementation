'use strict'

/** @type {import("eslint").Linter.Config} */
module.exports = {
  reportUnusedDisableDirectives: true,
  parserOptions: { ecmaVersion: 2021 },
  extends: ['@strv/node/v16', '@strv/node/optional', '@strv/node/style'],
  ignorePatterns: [
    'node_modules',
    // Ignore compiled JS files
    // Update the patterns as necessary if your project includes production-grade JS files
    '*.js',
    '*.d.ts',
    // Include dotfiles in the linting process as they are excluded by default
    '!.*.js',
    '!*.config.js',
  ],
  rules: {
    'max-len': ['warn', 120, 2],
  },
  overrides: [
    // Configuration for TypeScript
    {
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'import'],
      files: ['**/*.ts'],
      extends: [
        '@strv/node/v16',
        '@strv/node/optional',
        '@strv/node/style',
        '@strv/eslint-config-typescript',
        '@strv/eslint-config-typescript/style',
      ],
      parserOptions: {
        ecmaVersion: 2021,
        project: 'tsconfig.json',
      },
      settings: {
        'import/resolver': {
          typescript: {},
        },
      },
      rules: {
        'max-len': ['warn', 140, 2],
        'import/no-unused-modules': 'off',
        'import/exports-last': 'off',
        'import/group-exports': 'off',
        'id-length': 0,
        'max-classes-per-file': 0,
        'max-statements-per-line': ['warn', { max: 2 }],
        'no-new': 'off',
        'no-underscore-dangle': 0,
        '@typescript-eslint/naming-convention': 0,
        'padding-line-between-statements': ['warn', { blankLine: 'always', prev: '*', next: 'export' }],
      },
    },
  ],
}
