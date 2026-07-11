import type { Rule } from 'eslint';
import type { Program } from 'estree';

const allChecks = [
  'root-variable',
  'root-helper-function',
  'exported-const',
  'default-arrow-export',
  'inline-interface',
  'inline-type-alias',
  'zod-import',
] as const;

const zodImportPattern = /^zod(?:\/.*)?$/u;

function collectSpecifierExportedNames(program: Program): Set<string> {
  const names = new Set<string>();

  for (const statement of program.body) {
    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier') {
      names.add(statement.declaration.name);
    }

    if (statement.type === 'ExportNamedDeclaration' && statement.declaration === null) {
      for (const specifier of statement.specifiers) {
        if (specifier.local.type === 'Identifier') {
          names.add(specifier.local.name);
        }
      }
    }
  }

  return names;
}

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
    const visitor: Rule.RuleListener = {};

    if (enabled.has('root-variable')) {
      visitor['Program > VariableDeclaration'] = (node: Rule.Node) => {
        context.report({ node, messageId: 'rootVariable' });
      };
    }

    if (enabled.has('root-helper-function')) {
      // Any unexported root-level function is a helper. Inline-exported main
      // functions live under ExportNamedDeclaration and never match here;
      // specifier exports (`export default App`, `export { App }`) leave the
      // declaration directly under Program, so they are resolved by name.
      // Capitalized "private components" are not an exception; that mirrors
      // the enforced behavior of the source system's structural checker.
      visitor['Program > FunctionDeclaration'] = (node: Rule.Node) => {
        if (node.type === 'FunctionDeclaration' && node.parent.type === 'Program') {
          const exportedNames = collectSpecifierExportedNames(node.parent);

          if (node.id !== null && exportedNames.has(node.id.name)) {
            return;
          }
        }

        context.report({ node, messageId: 'rootHelperFunction' });
      };
    }

    if (enabled.has('exported-const')) {
      visitor['Program > ExportNamedDeclaration > VariableDeclaration'] = (node: Rule.Node) => {
        context.report({ node, messageId: 'exportedConst' });
      };
    }

    if (enabled.has('default-arrow-export')) {
      visitor['Program > ExportDefaultDeclaration > ArrowFunctionExpression'] = (node: Rule.Node) => {
        context.report({ node, messageId: 'defaultArrowExport' });
      };
    }

    if (enabled.has('inline-interface')) {
      visitor['TSInterfaceDeclaration'] = (node: Rule.Node) => {
        context.report({ node, messageId: 'inlineInterface' });
      };
    }

    if (enabled.has('inline-type-alias')) {
      visitor['TSTypeAliasDeclaration'] = (node: Rule.Node) => {
        context.report({ node, messageId: 'inlineTypeAlias' });
      };
    }

    if (enabled.has('zod-import')) {
      visitor['ImportDeclaration'] = (node: Rule.Node) => {
        if (node.type === 'ImportDeclaration' && zodImportPattern.test(String(node.source.value))) {
          context.report({ node, messageId: 'zodImport' });
        }
      };
    }

    return visitor;
  },
};
