import type { Rule } from 'eslint';
import type { Program } from 'estree';

import { allChecks, zodImportPattern } from './strict-colocation.constants.js';

/**
 * Collects every identifier a module exports through specifier statements —
 * `export default App` and `export { App }` — so root function declarations
 * exported that way are recognized as main modules rather than helpers.
 */
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
 * Builds the visitor fragment owned by each check id; the rule merges the
 * fragments for whichever checks its options enable.
 */
export function createCheckVisitors(
  context: Rule.RuleContext,
): Record<(typeof allChecks)[number], Rule.RuleListener> {
  return {
    'root-variable': {
      'Program > VariableDeclaration': (node: Rule.Node) => {
        context.report({ node, messageId: 'rootVariable' });
      },
    },
    // Any unexported root-level function is a helper. Inline-exported main
    // functions live under ExportNamedDeclaration and never match here;
    // specifier exports (`export default App`, `export { App }`) leave the
    // declaration directly under Program, so they are resolved by name.
    // Capitalized "private components" are not an exception; that mirrors
    // the enforced behavior of the source system's structural checker.
    'root-helper-function': {
      'Program > FunctionDeclaration': (node: Rule.Node) => {
        if (node.type === 'FunctionDeclaration' && node.parent.type === 'Program') {
          const exportedNames = collectSpecifierExportedNames(node.parent);

          if (node.id !== null && exportedNames.has(node.id.name)) {
            return;
          }
        }

        context.report({ node, messageId: 'rootHelperFunction' });
      },
    },
    'exported-const': {
      'Program > ExportNamedDeclaration > VariableDeclaration': (node: Rule.Node) => {
        context.report({ node, messageId: 'exportedConst' });
      },
    },
    'default-arrow-export': {
      'Program > ExportDefaultDeclaration > ArrowFunctionExpression': (node: Rule.Node) => {
        context.report({ node, messageId: 'defaultArrowExport' });
      },
    },
    'inline-interface': {
      TSInterfaceDeclaration: (node: Rule.Node) => {
        context.report({ node, messageId: 'inlineInterface' });
      },
    },
    'inline-type-alias': {
      TSTypeAliasDeclaration: (node: Rule.Node) => {
        context.report({ node, messageId: 'inlineTypeAlias' });
      },
    },
    'zod-import': {
      ImportDeclaration: (node: Rule.Node) => {
        if (node.type === 'ImportDeclaration' && zodImportPattern.test(String(node.source.value))) {
          context.report({ node, messageId: 'zodImport' });
        }
      },
    },
  };
}
