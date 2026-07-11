import type { Rule } from 'eslint';

import { allChecks } from './strict-colocation.constants.js';
import { createCheckVisitors } from './strict-colocation.helpers.js';

/**
 * Strict Colocation Rule: governed main modules export one named function and
 * delegate every other declaration kind to its role file — constants to
 * `*.constants.ts`, helpers to `*.helpers.ts`, types to `*.types.ts`, and Zod
 * schemas to `*.schema.ts`. The `checks` option narrows enforcement for role
 * files that legitimately own a subset (e.g. helpers may hold functions but
 * never inline types).
 */
export const strictColocation: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce role-file colocation for declarations in governed main modules',
    },
    messages: {
      rootVariable:
        'Strict Colocation: root-level variables are forbidden in governed modules. Move constants to *.constants.ts and helper state into the function body.',
      rootHelperFunction:
        'Strict Colocation: root-level helper functions are forbidden in governed modules. Move them to *.helpers.ts.',
      exportedConst:
        'Strict Colocation: export governed main modules as named function declarations, not root-level consts.',
      defaultArrowExport: 'Strict Colocation: export governed main modules as named function declarations.',
      inlineInterface: 'Strict Colocation: interfaces must be declared in a separate *.types.ts file.',
      inlineTypeAlias: 'Strict Colocation: type aliases must be declared in a separate *.types.ts file.',
      zodImport: 'Strict Colocation: Zod schemas must live in a dedicated *.schema.ts file.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          checks: {
            type: 'array',
            items: { enum: [...allChecks] },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const configuredChecks: readonly string[] = context.options[0]?.checks ?? allChecks;
    const enabled = new Set(configuredChecks);
    const checkVisitors = createCheckVisitors(context);
    const visitor: Rule.RuleListener = {};

    for (const check of allChecks) {
      if (enabled.has(check)) {
        Object.assign(visitor, checkVisitors[check]);
      }
    }

    return visitor;
  },
};
