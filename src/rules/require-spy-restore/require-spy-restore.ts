import type { Rule } from 'eslint';

import { createTrackingState, reportUnsatisfiedSpies, trackCallExpressionEnter, trackCallExpressionExit } from './require-spy-restore.helpers.js';
import type { RequireSpyRestoreOptions } from './require-spy-restore.types.js';

/**
 * Require Spy Restore Rule: every `vi.spyOn(...)` call — imported
 * namespaces, ambient globals (`console`, `Date`, `window`), member
 * expressions — must be satisfied by an `afterEach` that calls
 * `vi.restoreAllMocks()`, registered at the same describe-nesting scope as
 * the spy or at any ANCESTOR scope (module top level counts and covers the
 * whole file). A per-spy `.mockRestore()` call does NOT satisfy the
 * contract; `vi.restoreAllMocks()` is the deterministic, blanket-sufficient
 * one. The `assumeGlobalRestore` option lets a consumer declare their
 * Vitest config already sets `restoreMocks: true` globally, since this rule
 * cannot read the resolved Vitest config.
 *
 * Accepted static-analysis gaps (false negatives, never false positives): an
 * aliased `vi` import; `vi.restoreAllMocks()` called through a helper
 * function rather than directly inside the `afterEach` callback body;
 * `mockReset: true` consumers (resets but does not restore mock
 * implementations — intentionally not covered by `assumeGlobalRestore`,
 * which only documents `restoreMocks: true`).
 */
export const requireSpyRestore: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require every vi.spyOn call to be satisfied by an ancestor-scoped afterEach that calls vi.restoreAllMocks()',
    },
    messages: {
      unsatisfiedSpy:
        "Require Spy Restore: this vi.spyOn call has no afterEach in its own or an ancestor describe scope that calls vi.restoreAllMocks() — the spy leaks into later tests. Add one, or set restoreMocks: true in your Vitest config and pass { assumeGlobalRestore: true } to this rule.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          assumeGlobalRestore: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] as RequireSpyRestoreOptions | undefined;

    if (options?.assumeGlobalRestore === true) {
      return {};
    }

    const state = createTrackingState(context.sourceCode.ast);

    return {
      CallExpression(node) {
        trackCallExpressionEnter(state, node);
      },
      'CallExpression:exit'(node) {
        trackCallExpressionExit(state, node);
      },
      'Program:exit'() {
        reportUnsatisfiedSpies(context, state);
      },
    };
  },
};
