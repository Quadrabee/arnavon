import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import noOnlyTests from 'eslint-plugin-no-only-tests';

// Rules ported from @enspirit/eslint-config-node@0.1.5, which is eslintrc-only
// and therefore unusable from eslint's flat config.
const enspiritRules = {
  'prefer-template': 'warn',
  'template-curly-spacing': ['error', 'never'],
  curly: 'error',
  'prefer-arrow-callback': 'warn',
  'no-useless-escape': 'warn',
  eqeqeq: 'error',
  'no-multi-spaces': ['warn', {
    exceptions: { Property: true, VariableDeclarator: true, ImportDeclaration: true },
  }],
  indent: ['error', 2, { SwitchCase: 1 }],
  'linebreak-style': ['error', 'unix'],
  quotes: ['error', 'single'],
  semi: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': 'warn',
  'no-debugger': 'error',
  'no-unused-expressions': 'error',
  'array-bracket-spacing': ['error', 'never'],
  'object-curly-spacing': ['error', 'always'],
  'space-before-function-paren': ['error', {
    anonymous: 'never', named: 'never', asyncArrow: 'always',
  }],
  'space-before-blocks': ['error', 'always'],
  'keyword-spacing': ['error', { before: true, after: true }],
  'space-infix-ops': ['error', { int32Hint: false }],
  'space-in-parens': ['error', 'never'],
  'arrow-spacing': ['error', { before: true, after: true }],
  'no-multiple-empty-lines': ['error', { max: 1 }],
  'no-const-assign': 'error',
  'no-undef': 'error',
  'comma-dangle': ['error', 'always-multiline'],
  'no-only-tests/no-only-tests': 'error',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'pkg/**', 'coverage/**', 'example/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: { 'no-only-tests': noOnlyTests },
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      ...enspiritRules,
      // TypeScript itself resolves identifiers (including type-only globals
      // such as NodeJS.* and Express.*), so core no-undef only false-positives.
      'no-undef': 'off',
      // Handled by @typescript-eslint's equivalents below.
      'no-unused-expressions': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  {
    // Plain CommonJS files (root entry point, fixtures).
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.mocha },
    },
    rules: {
      // Tests deliberately reach into internals and stub private shapes.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        args: 'none',
      }],
    },
  },
);
