import tsParser from '@typescript-eslint/parser';
import type { ESLint, Linter } from 'eslint';

/**
 * Dumb UI preset: every `.tsx` file is presentational. Side effects live in
 * the colocated `use-*.ts` hook, never in the view.
 * @param plugin - the dlinter plugin instance the config registers itself with.
 * @returns flat config entries scoped to view files.
 */
export function createDumbUiConfig(plugin: ESLint.Plugin): Linter.Config[] {
  return [
    {
      name: 'dlinter/dumb-ui',
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: {
        dlinter: plugin,
      },
      rules: {
        'dlinter/no-view-effects': 'error',
      },
    },
  ];
}
