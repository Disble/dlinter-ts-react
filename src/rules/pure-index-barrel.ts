import type { Rule } from 'eslint';

/**
 * Pure Barrel Contract: an `index.ts` entrypoint only re-exports from sibling
 * modules — no local declarations, no imports, no side effects. Scope this
 * rule to `**​/index.ts` globs; the rule judges content, the config owns scope.
 */
export const pureIndexBarrel: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'restrict barrel entrypoints to re-export statements only',
    },
    messages: {
      impureBarrel:
        'Pure barrel contract: index.ts must only contain re-export statements with explicit module targets.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        for (const statement of node.body) {
          const isReExport =
            statement.type === 'ExportAllDeclaration' ||
            (statement.type === 'ExportNamedDeclaration' && statement.source != null && statement.declaration == null);

          if (!isReExport) {
            context.report({ node: statement, messageId: 'impureBarrel' });
          }
        }
      },
    };
  },
};
