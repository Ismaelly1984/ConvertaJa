// ESLint v9 flat config (no meta 'typescript-eslint' package)
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactPlugin from 'eslint-plugin-react'
import globals from 'globals'

export default [
  // Ignore build and vendor folders
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: { '@typescript-eslint': tsPlugin, react: reactPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      ...(tsPlugin.configs?.recommended?.rules ?? {}),
      'no-undef': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  // Service worker file: provide proper globals
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
]
