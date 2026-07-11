import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import checkFilePlugin from 'eslint-plugin-check-file';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import reactPlugin from 'eslint-plugin-react';
import reactDoctor from 'eslint-plugin-react-doctor';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import type { Linter } from 'eslint';

import { pluginBase } from '../../plugin.js';
import { downgradeRuleSeverities } from '../severities.js';
import {
  allDlinterRulesOff,
  documentationContexts,
  documentationExemptGlobs,
  governedMainModuleExemptGlobs,
  importXExtensions,
  nodeScriptGlobs,
  productionTestGlobs,
  sourceBrowserGlobs,
  typescriptPlugin,
} from './recommended.constants.js';
import type { RecommendedConfigOptions } from './recommended.types.js';

/**
 * Builds the full governance preset: bundled third-party plugin stack plus
 * every dlinter architecture rule, composed with the glob topology proven in
 * autoreas-bridge (views / hooks / delivery / role files / tests).
 * @param options - project-specific knobs: infrastructure edge, delivery globs, tsconfig path.
 * @returns flat config array ready to spread into `eslint.config.js`.
 */
export function createRecommendedConfig(options: RecommendedConfigOptions = {}): Linter.Config[] {
  const deliveryGlobs = [...(options.deliveryGlobs ?? ['src/App.tsx', 'src/app/**/*.{ts,tsx}'])];
  const tsconfigPath = options.tsconfigPath ?? './tsconfig.json';
  const infrastructureRule: Linter.RuleEntry = options.infrastructure
    ? [
        'error',
        {
          importPatterns: [...options.infrastructure.importPatterns],
          runtimeGlobals: [...options.infrastructure.runtimeGlobals],
        },
      ]
    : 'off';
  const reactDoctorWarnRules = downgradeRuleSeverities(reactDoctor.configs.recommended.rules);

  return [
    js.configs.recommended as Linter.Config,
    importX.flatConfigs.recommended as Linter.Config,
    importX.flatConfigs.typescript as Linter.Config,
    reactPlugin.configs.flat['jsx-runtime'] as Linter.Config,
    {
      ignores: ['dist/**/*', 'coverage/**/*'],
    },
    {
      files: nodeScriptGlobs,
      languageOptions: {
        globals: {
          console: 'readonly',
          process: 'readonly',
        },
      },
    },
    {
      files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: {
        sonarjs: sonarjsPlugin,
      },
      settings: {
        react: {
          version: 'detect',
        },
        'import-x/resolver-next': [
          createTypeScriptImportResolver({
            alwaysTryTypes: true,
            project: tsconfigPath,
          }),
          createNodeResolver({
            extensions: importXExtensions,
          }),
        ],
      },
      rules: {
        'import/default': 'off',
        'import/export': 'off',
        'import/named': 'off',
        'import/namespace': 'off',
        'import/no-duplicates': 'off',
        'import/no-named-as-default': 'off',
        'import/no-named-as-default-member': 'off',
        'import/no-unresolved': 'off',
        'no-redeclare': 'off',
        'import-x/no-cycle': ['error', { maxDepth: 1 }],
        'import-x/no-duplicates': 'error',
        'import-x/no-unresolved': 'error',
        'sonarjs/cognitive-complexity': ['warn', 15],
        'sonarjs/no-all-duplicated-branches': 'warn',
        'sonarjs/no-identical-functions': 'warn',
        'sonarjs/no-redundant-boolean': 'warn',
        'sonarjs/no-small-switch': 'warn',
      },
    },
    {
      files: sourceBrowserGlobs,
      languageOptions: {
        globals: {
          document: 'readonly',
          navigator: 'readonly',
          window: 'readonly',
        },
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      plugins: {
        '@typescript-eslint': typescriptPlugin,
      },
      rules: {
        'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
        // TypeScript owns undefined-symbol detection (tsc); ESLint's no-undef
        // only produces false positives on TS DOM/type-namespace globals.
        // Consumers keep a typecheck job in the gate — it is load-bearing.
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
        ],
      },
    },
    // Tests describe behavior, not production shape: mocks may keep unused params.
    {
      files: productionTestGlobs,
      plugins: {
        '@typescript-eslint': typescriptPlugin,
      },
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Rules-of-hooks safety net — no other plugin replaces these guarantees.
    {
      files: ['src/**/*.{ts,tsx}'],
      plugins: {
        'react-hooks': reactHooksPlugin,
      },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    // Declaration ownership is global for every maintained main module.
    {
      files: ['**/*.{ts,tsx}'],
      ignores: governedMainModuleExemptGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/strict-colocation': 'error',
      },
    },
    // Advisory react-doctor findings surface as warnings, never gate failures.
    {
      files: ['src/**/*.{ts,tsx}'],
      ignores: productionTestGlobs,
      plugins: {
        'react-doctor': reactDoctor,
      },
      rules: {
        ...reactDoctorWarnRules,
        // Requires React Compiler to be configured in the consumer project;
        // without it, manual memoization is still load-bearing.
        'react-doctor/react-compiler-no-manual-memoization': 'off',
      },
    },
    {
      files: ['src/**/*.{ts,tsx}'],
      plugins: {
        'check-file': checkFilePlugin,
      },
      rules: {
        'check-file/filename-blocklist': [
          'error',
          {
            'src/**/utils.ts': '*.helpers.ts',
            'src/**/Utils.ts': '*.helpers.ts',
          },
        ],
        'check-file/folder-match-with-fex': [
          'error',
          {
            'src/**/*.test.ts': '**/__tests__/',
            'src/**/*.test.tsx': '**/__tests__/',
          },
        ],
        'check-file/folder-naming-convention': [
          'error',
          {
            'src/features/*/': 'KEBAB_CASE',
          },
        ],
      },
    },
    // Every production .tsx outside the delivery layer is a presentational view.
    {
      files: ['src/**/*.tsx'],
      ignores: [...deliveryGlobs, ...productionTestGlobs],
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/no-view-effects': 'error',
        'dlinter/readonly-props': 'error',
        'dlinter/strict-colocation': 'error',
        'dlinter/no-infrastructure-in-view': infrastructureRule,
      },
    },
    // Delivery layer composes feature entrypoints — nothing else.
    {
      files: deliveryGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/composition-only-delivery': 'error',
        'dlinter/strict-colocation': 'error',
        'dlinter/no-infrastructure-in-view': infrastructureRule,
      },
    },
    // Barrel entrypoints only re-export; the barrel content contract is
    // single-file, so ESLint owns it (the folder topology lives below).
    {
      files: ['**/index.ts'],
      ignores: productionTestGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/pure-index-barrel': 'error',
      },
    },
    // Split modules are folder-owned. The rule reads real sibling files and
    // self-guards role files, index.ts, and declaration files.
    {
      files: ['src/**/*.ts'],
      ignores: documentationExemptGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/folder-ownership': 'error',
      },
    },
    // Public documentation is global by default across maintained TypeScript.
    {
      files: ['**/*.{ts,tsx}'],
      ignores: documentationExemptGlobs,
      plugins: {
        jsdoc: jsdocPlugin,
        dlinter: pluginBase,
      },
      rules: {
        'jsdoc/require-jsdoc': [
          'error',
          {
            contexts: documentationContexts,
            exemptEmptyConstructors: false,
            publicOnly: false,
            require: {
              ClassDeclaration: false,
              ClassExpression: false,
              FunctionDeclaration: false,
              MethodDefinition: false,
            },
          },
        ],
        'dlinter/require-exported-variable-jsdoc': 'error',
      },
    },
    // Every production hook follows the anatomy and colocation contract.
    {
      files: ['src/**/use-*.ts'],
      ignores: productionTestGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/hook-anatomy': 'error',
        'dlinter/strict-colocation': 'error',
      },
    },
    // Type contracts for every production *.types.ts file.
    {
      files: ['src/**/*.types.ts'],
      ignores: productionTestGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/readonly-props': 'error',
      },
    },
    // Helpers own functions but never root-level constants/state (those
    // belong in *.constants.ts) nor inline type declarations.
    {
      files: ['src/**/*.helpers.ts'],
      ignores: productionTestGlobs,
      plugins: {
        dlinter: pluginBase,
      },
      rules: {
        'dlinter/strict-colocation': [
          'error',
          { checks: ['root-variable', 'inline-interface', 'inline-type-alias'] },
        ],
      },
    },
    // Final reset: tests stay exempt no matter what earlier blocks enabled.
    {
      files: productionTestGlobs,
      plugins: {
        dlinter: pluginBase,
        jsdoc: jsdocPlugin,
      },
      rules: {
        ...allDlinterRulesOff,
        'jsdoc/require-jsdoc': 'off',
      },
    },
  ];
}
