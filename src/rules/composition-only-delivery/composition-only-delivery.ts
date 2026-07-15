import type { Rule } from 'eslint';

import { customHookModulePattern, reactHookNamePattern } from './composition-only-delivery.constants.js';

// fallow-ignore-next-line code-duplication -- selector/report structure remains local for readability and rule-specific message contracts.
/**
 * Delivery Layer Rule: delivery files (App.tsx, app/**) compose feature
 * entrypoints — they never orchestrate. No React hooks, no custom hook
 * imports; screen logic belongs in feature hooks and components.
 */
export const compositionOnlyDelivery: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'restrict delivery-layer files to pure composition',
    },
    messages: {
      reactHookImport:
        'Delivery Rule: composition files cannot import React hooks. Move screen logic into feature hooks or components.',
      // fallow-ignore-next-line code-duplication -- selector/report structure remains local for readability and rule-specific message contracts.
      reactHookNamespace:
        'Delivery Rule: composition files cannot call React hooks through the React namespace. Move screen logic into feature hooks or components.',
      customHookImport:
        'Delivery Rule: composition files cannot import custom hooks directly. Render a feature entrypoint component instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      [`ImportDeclaration[source.value='react'] ImportSpecifier[imported.name=/${reactHookNamePattern}/]`](
        node: Rule.Node,
      ) {
        context.report({ node, messageId: 'reactHookImport' });
      },
      [`MemberExpression[object.name='React'][property.name=/${reactHookNamePattern}/]`](node: Rule.Node) {
        context.report({ node, messageId: 'reactHookNamespace' });
      },
      ImportDeclaration(node) {
        if (customHookModulePattern.test(String(node.source.value))) {
          context.report({ node, messageId: 'customHookImport' });
        }
      },
    };
  },
};
