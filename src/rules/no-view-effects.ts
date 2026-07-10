import type { Rule } from 'eslint';

const effectHookPattern = /^use(?:Effect|LayoutEffect)$/u;

/**
 * Dumb UI Rule: view components (.tsx) must stay presentational. Side effects
 * belong in the colocated `use-*.ts` hook, never in the view itself.
 */
export const noViewEffects: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid useEffect/useLayoutEffect inside view components',
    },
    messages: {
      viewEffectForbidden:
        'Dumb UI Rule: view components cannot call {{hookName}}. Move side effects into the colocated use-*.ts hook.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'Identifier' && effectHookPattern.test(callee.name)) {
          context.report({ node, messageId: 'viewEffectForbidden', data: { hookName: callee.name } });
          return;
        }

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'React' &&
          callee.property.type === 'Identifier' &&
          effectHookPattern.test(callee.property.name)
        ) {
          context.report({ node, messageId: 'viewEffectForbidden', data: { hookName: callee.property.name } });
        }
      },
    };
  },
};
