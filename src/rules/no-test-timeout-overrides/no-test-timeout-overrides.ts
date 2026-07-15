import type { Rule } from 'eslint';
import type { Property } from 'estree';

import { checkConfigTimeoutRaiseProperty, checkTimeoutCallExpression } from './no-test-timeout-overrides.helpers.js';

/**
 * No Test Timeout Overrides Rule: the default timeout budget is a
 * regression detector; raising it papers over a performance bug. In test
 * files this is a value-independent presence ban on per-test/hook timeout
 * overrides (positional trailing arguments, options-object `timeout`, and
 * `vi.setConfig`). In Vitest config files it is a raise-only check against
 * Vitest's own asymmetric defaults (`testTimeout: 5000`, `hookTimeout:
 * 10000`) — lowering the budget stays legal.
 *
 * Accepted static-analysis gaps (false negatives, never false positives): a
 * computed property key (`{ [key]: value }`) is never inspected as a
 * `timeout`/`testTimeout`/`hookTimeout` candidate; the config-file check
 * anchors on a property literally named `test`, so an unrelated,
 * same-shaped object literal in a governed file (e.g. `{ test: { testTimeout:
 * 20000 } }` outside a real Vitest config export) would also be flagged — a
 * known trade-off of anchoring on shape rather than resolved config
 * semantics. `vi.setConfig`/`mergeConfig` gaps are documented in
 * `no-test-timeout-overrides.helpers.ts`.
 */
export const noTestTimeoutOverrides: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'forbid raising per-test/hook timeouts in test files, and raising testTimeout/hookTimeout above the Vitest default in config files',
    },
    messages: {
      perTestTimeout:
        'No Test Timeout Overrides: a per-test timeout override hides a performance regression instead of fixing it. Remove the argument — the default budget is the regression detector.',
      optionsTimeout:
        'No Test Timeout Overrides: a timeout in the options object hides a performance regression instead of fixing it. Remove the timeout key — the default budget is the regression detector.',
      hookTimeout:
        'No Test Timeout Overrides: a per-hook timeout override hides a performance regression instead of fixing it. Remove the argument — the default budget is the regression detector.',
      setConfigTimeout:
        'No Test Timeout Overrides: vi.setConfig must not override testTimeout/hookTimeout at runtime. Remove the key — the default budget is the regression detector.',
      configTimeoutRaise:
        "No Test Timeout Overrides: raising testTimeout/hookTimeout above Vitest's default weakens the regression detector for every test in this project. Only lowering the value is allowed.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        checkTimeoutCallExpression(context, node);
      },
      Property(node: Rule.Node) {
        if (node.type === 'Property') {
          checkConfigTimeoutRaiseProperty(context, node as Rule.Node & Property);
        }
      },
    };
  },
};
