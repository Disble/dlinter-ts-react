import type { Rule } from 'eslint';

import { defaultLocalAliasPrefixes } from './no-partial-package-mock.constants.js';
import { checkImportActualCall, checkMockFactoryCall } from './no-partial-package-mock.helpers.js';
import type { NoPartialPackageMockOptions } from './no-partial-package-mock.types.js';

/**
 * No Partial Package Mock Rule: a `vi.mock`/`vi.doMock` factory that
 * references its first parameter on a bare package specifier couples the
 * test to Vitest's module-loader internals and breaks under
 * `deps.optimizer` (first-party repro: autoreas-bridge branch
 * `perf/vitest-dev-env`, commit `d8d80ee`, Vitest 4.1.3–4.1.6 — no public
 * Vitest issue yet). `vi.importActual` on a bare specifier reproduces the
 * identical bug.
 *
 * Accepted static-analysis gaps (false negatives, never false positives):
 * non-static specifiers (a variable, or a template literal with interpolated
 * expressions); a factory passed as an identifier reference
 * (`vi.mock('pkg', sharedFactory)` — the rule only inspects an inline
 * function/arrow-function factory argument); an aliased `vi` import (the
 * rule matches the literal identifier `vi`).
 */
export const noPartialPackageMock: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'forbid vi.mock/vi.doMock factories that partially replace a bare package specifier, and vi.importActual on bare specifiers',
    },
    messages: {
      partialPackageMock:
        'No Partial Package Mock: a factory that reads the real module through its first parameter on a bare specifier breaks under Vitest\'s dependency optimizer. Use a namespace spy (import * as pkg from \'pkg\'; vi.spyOn(pkg, \'name\')) for non-optimized packages, or a full replacement factory (vi.mock(\'pkg\', () => ({ ...complete replacement... }))) for optimized ones.',
      importActualPackage:
        'No Partial Package Mock: vi.importActual on a bare package specifier reproduces the same module-loader bug as a partial factory. Use a namespace spy (import * as pkg from \'pkg\'; vi.spyOn(pkg, \'name\')) or a full replacement factory instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          localAliasPrefixes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] as NoPartialPackageMockOptions | undefined;
    const localAliasPrefixes = options?.localAliasPrefixes ?? defaultLocalAliasPrefixes;

    return {
      'CallExpression[callee.type="MemberExpression"][callee.object.name="vi"][callee.property.name=/^(mock|doMock)$/]'(
        node: Rule.Node,
      ) {
        if (node.type === 'CallExpression') {
          checkMockFactoryCall(context, node, localAliasPrefixes);
        }
      },
      'CallExpression[callee.type="MemberExpression"][callee.object.name="vi"][callee.property.name="importActual"]'(
        node: Rule.Node,
      ) {
        if (node.type === 'CallExpression') {
          checkImportActualCall(context, node, localAliasPrefixes);
        }
      },
    };
  },
};
