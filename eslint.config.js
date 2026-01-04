// ESLint 9 flat config for TypeScript + Svelte
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Svelte recommended rules
  ...svelte.configs['flat/recommended'],

  // Global settings
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Svelte files - use TypeScript parser and custom rules
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // These are often false positives in Svelte 5 reactive patterns
      'svelte/infinite-reactive-loop': 'warn',
      'svelte/no-reactive-reassign': 'warn',

      // Navigation rules - we're using SvelteKit correctly
      'svelte/no-navigation-without-resolve': 'off',

      // Each key - nice to have but not critical
      'svelte/require-each-key': 'warn',

      // SvelteMap/SvelteSet - newer pattern, warn for now
      'svelte/prefer-svelte-reactivity': 'warn',

      // Unused svelte-ignore - often leftover from upgrades
      'svelte/no-unused-svelte-ignore': 'warn',

      // Immutable reactive statements - complex to fix
      'svelte/no-immutable-reactive-statements': 'warn',

      // Allow unused vars with underscore prefix in Svelte
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Custom rules for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Allow explicit any in some cases (warn instead of error)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/',
      'build/',
      '.svelte-kit/',
      'src-tauri/target/',
      'node_modules/',
      'api/node_modules/',
      '*.config.js',
      '*.config.ts',
      'vite.config.js',
      'svelte.config.js',
      'vitest.config.ts',
      'api/openapi/',
      'src/types/api-generated.ts',
    ],
  },
];
