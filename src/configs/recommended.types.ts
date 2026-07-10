/**
 * Consumer-defined infrastructure edge: which import specifiers and runtime
 * globals count as "infrastructure" that views must never touch directly.
 * Example for a Wails project: `{ importPatterns: ['(^|/)wailsjs(/|$)'], runtimeGlobals: ['window.go'] }`.
 */
export interface InfrastructureBoundaryOptions {
  /** Regex sources matched against import specifiers. */
  readonly importPatterns: readonly string[];
  /** `object.property` member paths (e.g. `window.go`). */
  readonly runtimeGlobals: readonly string[];
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
}
