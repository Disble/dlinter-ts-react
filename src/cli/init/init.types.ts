/**
 * Target location options for the init scaffolder.
 */
export interface InitOptions {
  readonly cwd: string;
}

/**
 * Outcome of an init run: files written vs. files intentionally left alone.
 */
export interface InitResult {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
}
