/**
 * Options for the `no-partial-package-mock` rule.
 */
export interface NoPartialPackageMockOptions {
  /**
   * Specifier prefixes treated as local aliases, never flagged as bare
   * package specifiers (e.g. tsconfig path aliases). Default: `['@/', '~/']`.
   */
  readonly localAliasPrefixes?: readonly string[];
}
