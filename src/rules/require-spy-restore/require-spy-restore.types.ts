import type { BlockStatement, CallExpression, Program } from 'estree';

/**
 * Options for the `require-spy-restore` rule.
 */
export interface RequireSpyRestoreOptions {
  /**
   * The consumer declares their Vitest config sets `restoreMocks: true`
   * globally. An ESLint rule cannot read the resolved Vitest config, so this
   * is the consumer's own declaration; when `true`, the rule reports
   * nothing. Default `false`.
   */
  readonly assumeGlobalRestore?: boolean;
}

/** A describe-nesting scope: either a describe callback's block body, or the module top level. */
export type SpyRestoreContainer = BlockStatement | Program;

/** Mutable traversal state shared across the single `CallExpression` pass. */
export interface SpyRestoreTrackingState {
  readonly programNode: Program;
  readonly containerStack: SpyRestoreContainer[];
  readonly satisfyingContainers: Set<SpyRestoreContainer>;
  readonly pendingSpies: { node: CallExpression; ancestorContainers: SpyRestoreContainer[] }[];
  afterEachDepth: number;
}
