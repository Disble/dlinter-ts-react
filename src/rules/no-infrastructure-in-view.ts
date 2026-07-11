import type { Rule } from 'eslint';

/**
 * Feature Boundary Rule: presentational and composition files never touch the
 * infrastructure edge directly — neither by importing generated bindings nor
 * through runtime globals. The edge itself is consumer configuration:
 * `importPatterns` are regex sources matched against import specifiers, and
 * `runtimeGlobals` are `object.property` member paths (e.g. `window.go`).
 * Without options the rule is inert by design.
 */
export const noInfrastructureInView: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid direct access to the configured infrastructure edge from views',
    },
    messages: {
      infrastructureImport:
        'Feature Boundary: this file cannot import infrastructure bindings ({{source}}) directly. Route the call through the colocated use-*.ts hook or adapter.',
      infrastructureRuntime:
        'Feature Boundary: this file cannot access the {{memberPath}} runtime directly. Route the call through the colocated use-*.ts hook or adapter.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          importPatterns: {
            type: 'array',
            items: { type: 'string' },
          },
          runtimeGlobals: {
            type: 'array',
            items: { type: 'string', pattern: String.raw`^[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*$` },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const importPatterns: readonly string[] = context.options[0]?.importPatterns ?? [];
    const runtimeGlobals: readonly string[] = context.options[0]?.runtimeGlobals ?? [];
    const importMatchers = importPatterns.map((pattern) => new RegExp(pattern, 'u'));
    const runtimePaths = runtimeGlobals.map((memberPath) => {
      const [objectName, propertyName] = memberPath.split('.');
      return { memberPath, objectName, propertyName };
    });

    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);

        if (importMatchers.some((matcher) => matcher.test(source))) {
          context.report({ node, messageId: 'infrastructureImport', data: { source } });
        }
      },
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || node.property.type !== 'Identifier') {
          return;
        }

        const objectName = node.object.name;
        const propertyName = node.property.name;
        const match = runtimePaths.find(
          (candidate) => candidate.objectName === objectName && candidate.propertyName === propertyName,
        );

        if (match) {
          context.report({ node, messageId: 'infrastructureRuntime', data: { memberPath: match.memberPath } });
        }
      },
    };
  },
};
