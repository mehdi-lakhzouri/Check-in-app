// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Disable explicit any - we use it intentionally in some places
      '@typescript-eslint/no-explicit-any': 'off',
      
      // Relax unsafe rules - these are too strict for a NestJS codebase
      // that uses decorators and runtime type checks
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      
      // Relax async/await requirement - sometimes sync methods return promises
      '@typescript-eslint/require-await': 'off',
      
      // Allow floating promises with void operator
      '@typescript-eslint/no-floating-promises': 'warn',
      
      // Relax unused vars - prefix with underscore to ignore
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      
      // Relax unbound-method for test files using Jest matchers
      '@typescript-eslint/unbound-method': 'off',
      
      // Allow ObjectId in template literals (common in MongoDB operations)
      '@typescript-eslint/restrict-template-expressions': 'off',
      
      // Allow redundant type constituents for error union types
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      
      // Allow generator functions without yield (for mock factories)
      'require-yield': 'off',
      
      // Allow Function type in some cases
      '@typescript-eslint/no-unsafe-function-type': 'off',
      
      // Prettier formatting
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);
