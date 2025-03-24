// eslint.config.js
const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier jadi warning, bukan error
      'prettier/prettier': 'warn',

      // Tidak pakai await? Tidak masalah.
      '@typescript-eslint/require-await': 'off',

      // Tidak larang pakai 'any'
      '@typescript-eslint/no-explicit-any': 'off',

      // Variabel tak terpakai? Cukup warning
      '@typescript-eslint/no-unused-vars': ['warn'],

      // Tambahan relaksasi opsional
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];
