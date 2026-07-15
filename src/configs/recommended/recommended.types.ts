/**
 * Consumer-defined infrastructure edge: which import specifiers and runtime
 * globals count as "infrastructure" that views must never touch directly.
 * Example for a Wails project: `{ importPatterns: ['(^|/)wailsjs(/|$)'], runtimeGlobals: ['window.go'] }`.
 */
export interface InfrastructureBoundaryOptions {
  /** Regex sources matched against import specifiers. Default: `[]`. */
  readonly importPatterns?: readonly string[];
  /** `object.property` member paths (e.g. `window.go`). Default: `[]`. */
  readonly runtimeGlobals?: readonly string[];
}

/**
 * Options for the recommended preset factory.
 */
export interface RecommendedConfigOptions {
  /** Infrastructure edge definition. Omitted → boundary rule stays off. */
  readonly infrastructure?: InfrastructureBoundaryOptions;
  /** Delivery-layer globs (composition-only files). Default: `src/App.tsx` + `src/app/**`. */
  readonly deliveryGlobs?: readonly string[];
  /** tsconfig used by the import resolver. Default: `./tsconfig.json`. */
  readonly tsconfigPath?: string;
  /**
   * The project compiles with React Compiler. Activates
   * `react-doctor/react-compiler-no-manual-memoization` at its upstream
   * severity (manual `useMemo`/`useCallback` become redundant noise once the
   * compiler memoizes). Default `false`: without the compiler, manual
   * memoization is load-bearing and the rule would only mislead.
   */
  readonly reactCompiler?: boolean;
  /**
   * Activates the Vitest testing-hygiene rule block: `dlinter/no-partial-package-mock`,
   * `dlinter/no-test-timeout-overrides`, and `dlinter/require-spy-restore` at
   * `error` on test files, plus `dlinter/no-test-timeout-overrides` on Vitest
   * config files (`vite.config.*`, `vitest.config.*`, `vitest.workspace.*`).
   * Default `false` (opt-in): these are the first dlinter rules that APPLY to
   * tests, so existing consumers see zero behavior change until they opt in.
   */
  readonly vitestHygiene?: boolean;
}
