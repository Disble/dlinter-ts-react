import type { Rule } from 'eslint';

import { hookBlock } from './hook-anatomy.constants.js';

/**
 * Hook Anatomy Rule: exported hooks follow one ordering — derived state
 * (useMemo) before callbacks (useCallback) before effects (useEffect) — and
 * always end with a return statement.
 */
export const hookAnatomy: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce useMemo → useCallback → useEffect ordering and a final return in exported hooks',
    },
    messages: {
      effectBeforeDerived: 'Hook Anatomy Rule: useEffect must come after derived state and callbacks in hooks.',
      memoAfterCallback: 'Hook Anatomy Rule: useMemo derived state must come before useCallback callbacks in hooks.',
      missingReturn: 'Hook Anatomy Rule: hooks must end with a return statement.',
    },
    schema: [],
  },
  create(context) {
    return {
      [`${hookBlock} > ExpressionStatement:has(CallExpression[callee.name="useEffect"]) ~ VariableDeclaration:has(CallExpression[callee.name=/^use(Memo|Callback)$/])`](
        node: Rule.Node,
      ) {
        context.report({ node, messageId: 'effectBeforeDerived' });
      },
      [`${hookBlock} > ExpressionStatement:has(CallExpression[callee.object.name="React"][callee.property.name="useEffect"]) ~ VariableDeclaration:has(CallExpression[callee.name=/^use(Memo|Callback)$/])`](
        node: Rule.Node,
      ) {
        context.report({ node, messageId: 'effectBeforeDerived' });
      },
      [`${hookBlock} > VariableDeclaration:has(CallExpression[callee.name="useCallback"]) ~ VariableDeclaration:has(CallExpression[callee.name="useMemo"])`](
        node: Rule.Node,
      ) {
        context.report({ node, messageId: 'memoAfterCallback' });
      },
      [`${hookBlock} > :not(ReturnStatement):last-child`](node: Rule.Node) {
        context.report({ node, messageId: 'missingReturn' });
      },
    };
  },
};
