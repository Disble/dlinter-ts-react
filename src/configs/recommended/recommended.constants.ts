import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import type { ESLint, Linter } from 'eslint';

/**
 * The @typescript-eslint plugin object types its rules more richly than core
 * ESLint's Plugin contract; the runtime shape is compatible.
 */
export const typescriptPlugin = tsPlugin as unknown as ESLint.Plugin;

const tsPluginConfigs = tsPlugin.configs as unknown as Record<
  string,
  { rules?: Linter.RulesRecord }
>;

/**
 * @typescript-eslint's recommended (non-type-checked) rules — the plugin's own
 * per-rule triage (20 definite-bug rules at "error"), spread as-is across all
 * maintained TypeScript. The error-set is locked by the drift test in
 * upstream-severity-drift.test.ts; the plugin is pinned to an exact version.
 */
export const typescriptRecommendedRules: Linter.RulesRecord =
  tsPluginConfigs['recommended']?.rules ?? {};

/**
 * @typescript-eslint's type-checked-only tier — the highest-value bug rules a
 * real TypeScript program unlocks (no-floating-promises, no-misused-promises,
 * await-thenable, the no-unsafe-* family), upstream severities respected
 * as-is. Applied only where the project service can build a program
 * (production src); locked by the same drift test.
 */
export const typescriptTypeCheckedOnlyRules: Linter.RulesRecord =
  tsPluginConfigs['recommended-type-checked-only']?.rules ?? {};

/**
 * sonarjs' recommended rules — the plugin author's per-rule triage (206 rules
 * at "error", 62 off upstream), spread AS-IS. The preset never
 * blanket-downgrades a bundled plugin: only the named rules in
 * sonarjsSurgicalOverrides are re-tuned, each with a documented reason. The
 * upstream error-set is locked by the drift test and sonarjs is pinned exact.
 */
export const sonarjsRecommendedRules: Linter.RulesRecord =
  (sonarjsPlugin.configs as unknown as Record<string, { rules?: Linter.RulesRecord }>).recommended
    ?.rules ?? {};

/**
 * Surgical severity overrides for sonarjs' recommended set — the ONLY rules
 * re-tuned from upstream, each a deliberate decision with a reason. Everything
 * else in the 206-rule error tier blocks, exactly as sonarjs triaged it.
 */
export const sonarjsSurgicalOverrides: Linter.RulesRecord = {
  // NOTE deliberately NOT overridden — kept at upstream "error" so the ESLint
  // gate and the Fallow audit agree on one standard: cognitive-complexity
  // (Fallow complexity hotspots), no-identical-functions (Fallow dupes),
  // no-nested-conditional (upstream's readability verdict stands, JSX
  // included).
  //
  // Task-marker comments represent tracked work rather than defects. Blocking
  // commits on them teaches teams to delete the signal rather than pay the debt.
  'sonarjs/fixme-tag': 'warn',
  'sonarjs/todo-tag': 'warn',
  // @typescript-eslint/no-unused-vars owns unused detection with the
  // underscore-ignore convention; the sonarjs twin would flag the `_`-prefixed
  // parameters that convention deliberately permits.
  'sonarjs/no-unused-vars': 'off',
  // NOTE prefer-read-only-props is deliberately NOT overridden: it stays at
  // upstream "error" for SonarQube Cloud parity (consumers are scanned there —
  // silencing it locally would make local green lie about the Cloud verdict).
  // It COEXISTS with dlinter/readonly-props rather than replacing it: verified
  // that even fully type-aware, the sonarjs rule never governs Props
  // interfaces in *.types.ts role files and needs a complete TS program, while
  // the dlinter rule works syntactically everywhere. Overlap on component
  // boundaries is accepted — both point to the same fix.
  //
  // Security hotspot, not a bug: Math.random is legitimate for the non-crypto
  // purposes frontend code actually has (jitter, animation, sampling).
  'sonarjs/pseudo-random': 'warn',
};

/**
 * sonarjs rules that misfire specifically on test code: fixtures legitimately
 * contain fake credentials, fake secrets, and literal IPs. This MIRRORS
 * SonarQube Cloud behavior — files under `sonar.tests` get a reduced rule
 * profile there and these main-code rules do not run on them — so local
 * verdicts and Cloud verdicts stay aligned. Everything else in sonarjs stays
 * ON in tests — no-exclusive-tests, no-skipped-tests, and the assertion rules
 * earn their keep there.
 */
export const sonarjsTestContextOverrides: Linter.RulesRecord = {
  'sonarjs/hardcoded-secret-signatures': 'off',
  'sonarjs/no-hardcoded-ip': 'off',
  'sonarjs/no-hardcoded-passwords': 'off',
  'sonarjs/no-hardcoded-secrets': 'off',
};

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

/**
 * Surgical severity overrides for react-doctor's recommended set.
 *
 * POLICY — never blanket-downgrade a third-party plugin's ruleset. react-doctor
 * already triages every rule it ships (upstream: 34 error / 198 warn), and that
 * per-rule judgment is exactly the work this package exists to do for consumers.
 * The preset therefore spreads react-doctor's recommended rules AS-IS and
 * overrides ONLY the specific rule IDs that genuinely misfire in this
 * architecture — each entry below is a deliberate decision with a documented
 * reason, not a bulk sweep. The upstream error-set is locked by a drift test
 * (`recommended.test.ts`), and react-doctor is pinned to an exact version, so
 * the set cannot shift silently: a bump that changes it fails CI and forces a
 * re-triage here.
 */
export const reactDoctorSurgicalOverrides: Linter.RulesRecord = {
  // Requires React Compiler to be configured in the consumer project; without
  // it, manual memoization is still load-bearing, so this rule would only
  // produce false positives. Off until the consumer opts into the compiler.
  'react-doctor/react-compiler-no-manual-memoization': 'off',
};

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
