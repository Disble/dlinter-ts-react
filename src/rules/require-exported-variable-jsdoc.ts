import type { Rule } from 'eslint';

/**
 * Documentation Contract Rule: every exported variable declaration carries an
 * immediately preceding JSDoc block. Complements `jsdoc/require-jsdoc`, whose
 * contexts cover functions, interfaces, and type aliases but not variables.
 */
export const requireExportedVariableJsdoc: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require JSDoc immediately before exported variable declarations',
    },
    messages: {
      missingJsdoc: 'Exported variables must have an immediately preceding JSDoc block.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration?.type !== 'VariableDeclaration') {
          return;
        }

        const precedingComment = sourceCode.getCommentsBefore(node).at(-1);
        const hasJsdoc = precedingComment?.type === 'Block' && precedingComment.value.startsWith('*');

        if (!hasJsdoc) {
          context.report({ node, messageId: 'missingJsdoc' });
        }
      },
    };
  },
};
