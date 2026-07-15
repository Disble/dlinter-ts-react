import type { Rule } from 'eslint';

import { propsBoundary } from './readonly-props.constants.js';

/**
 * Type Contract Rule: component props are immutable. Parameters use
 * `Readonly<Props>` at the function boundary, and every field of a `*Props`
 * interface is declared readonly.
 */
export const readonlyProps: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require Readonly<Props> boundaries and readonly Props fields',
    },
    messages: {
      // fallow-ignore-next-line code-duplication -- selector/report structure remains local for readability and rule-specific message contracts.
      boundaryNotReadonly:
        'Type Contract Rule: component props parameters must use Readonly<Props> at the function boundary.',
      propsFieldNotReadonly: 'Type Contract Rule: every Props field must be declared as readonly.',
    },
    schema: [],
  },
  create(context) {
    return {
      [`ExportNamedDeclaration > FunctionDeclaration > Identifier${propsBoundary}`](node: Rule.Node) {
        context.report({ node, messageId: 'boundaryNotReadonly' });
      },
      [`ExportNamedDeclaration > FunctionDeclaration > ObjectPattern${propsBoundary}`](node: Rule.Node) {
        context.report({ node, messageId: 'boundaryNotReadonly' });
      },
      ['TSInterfaceDeclaration[id.name=/Props$/] TSPropertySignature[readonly!=true]'](node: Rule.Node) {
        context.report({ node, messageId: 'propsFieldNotReadonly' });
      },
    };
  },
};
