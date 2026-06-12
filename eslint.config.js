import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESTRICTED_IMPORTS_RULE = [
  'error',
  {
    patterns: [
      {
        group: ['../*', '../../*', '../../../*', '../../../../*'],
        message:
          'Use @ path aliases instead of relative imports (../). Import from @/components/... or @/utils/... instead.',
      },
    ],
  },
];

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-redeclare': 'error',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      // TypeScript itself checks undefined identifiers; core no-undef false-positives
      // on type-only references in .ts/.tsx files.
      'no-undef': 'off',
      'no-console': 'warn',
      'no-restricted-imports': RESTRICTED_IMPORTS_RULE,
    },
  },
  // The project logger is the single sanctioned console sink (CLAUDE.md: Logging).
  {
    files: ['src/lib/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Test relaxations per the linting posture: `!`, `||`, and implicit return types allowed.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
  // vite.config.ts is type-checked against tsconfig.node.json and may use
  // console and relative imports (scripts relaxation).
  {
    files: ['vite.config.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.node.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dev-dist/**',
      'eslint.config.js',
      'supabase/**',
    ],
  },
];
