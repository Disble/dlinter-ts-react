import tsPlugin from '@typescript-eslint/eslint-plugin';
import type { ESLint, Linter } from 'eslint';

/**
 * The @typescript-eslint plugin object types its rules more richly than core
 * ESLint's Plugin contract; the runtime shape is compatible.
 */
export const typescriptPlugin = tsPlugin as unknown as ESLint.Plugin;

/** Extensions the import-x node resolver probes when resolving specifiers. */
export const importXExtensions = ['.js', '.jsx', '.ts', '.tsx', '.d.ts'];

/** Globs identifying test files, which stay outside the architecture contract. */
export const productionTestGlobs = [
  '**/__tests__/**/*.{ts,tsx}',
  '**/*.test.{ts,tsx}',
  'src/test/**/*.{ts,tsx}',
  'test/**/*.{ts,tsx}',
];

/** Globs for repository automation scripts that run under Node. */
export const nodeScriptGlobs = ['scripts/**/*.{js,mjs,cjs}'];

/** Globs for application source that runs in the browser. */
export const sourceBrowserGlobs = ['src/**/*.{ts,tsx,js,jsx}'];

/** Files exempt from the public-documentation contract: tests and documented-invalid fixtures. */
export const documentationExemptGlobs = [...productionTestGlobs, '**/*.invalid.{ts,tsx,js,jsx}'];

/** Files that are not governed main modules: exempt files plus barrels and role files. */
export const governedMainModuleExemptGlobs = [
  ...documentationExemptGlobs,
  '**/index.ts',
  '**/*.constants.ts',
  '**/*.helpers.ts',
  '**/*.schema.ts',
  '**/*.types.ts',
];

/** AST selector contexts that `jsdoc/require-jsdoc` treats as public documentation surface. */
export const documentationContexts = [
  'ExportNamedDeclaration > FunctionDeclaration',
  'ExportNamedDeclaration > TSInterfaceDeclaration',
  'ExportNamedDeclaration > TSTypeAliasDeclaration',
  'ExportDefaultDeclaration > FunctionDeclaration',
  'ExportDefaultDeclaration > ArrowFunctionExpression',
  'ExportDefaultDeclaration > CallExpression > ArrowFunctionExpression',
];

/** Full dlinter rule map at severity "off" — the final reset applied to test files. */
export const allDlinterRulesOff: Linter.RulesRecord = {
  'dlinter/composition-only-delivery': 'off',
  'dlinter/folder-ownership': 'off',
  'dlinter/hook-anatomy': 'off',
  'dlinter/no-infrastructure-in-view': 'off',
  'dlinter/no-view-effects': 'off',
  'dlinter/pure-index-barrel': 'off',
  'dlinter/readonly-props': 'off',
  'dlinter/require-exported-variable-jsdoc': 'off',
  'dlinter/strict-colocation': 'off',
};
