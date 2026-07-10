import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Rule } from 'eslint';

const roleSuffixes = ['.constants.ts', '.helpers.ts', '.schema.ts', '.types.ts'];

/**
 * Split Module Ownership Rule: when a main module splits into role files
 * (`*.helpers.ts`, `*.types.ts`, `*.constants.ts`, `*.schema.ts`), the whole
 * unit moves into a folder named after the module with a pure `index.ts`
 * entrypoint. Sibling detection reads the real filesystem, so the rule guards
 * its own scope: role files, `index.ts`, and declaration files are skipped
 * regardless of config globs.
 */
export const folderOwnership: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require folder-owned entrypoints for main modules split into role files',
    },
    messages: {
      flatSplitModule:
        'Split module ownership: flat main modules with sibling role files must move into a dedicated folder with a pure index.ts entrypoint.',
      missingFolderIndex:
        'Split module ownership: folder-owned modules with role files must publish a pure index.ts entrypoint in the same folder.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename;
        const baseName = path.basename(filename);

        if (
          !baseName.endsWith('.ts') ||
          baseName.endsWith('.d.ts') ||
          baseName === 'index.ts' ||
          roleSuffixes.some((suffix) => baseName.endsWith(suffix))
        ) {
          return;
        }

        const moduleStem = baseName.slice(0, -'.ts'.length);
        const moduleDirectory = path.dirname(filename);
        const splitRoleSiblings = roleSuffixes.filter((suffix) =>
          existsSync(path.join(moduleDirectory, `${moduleStem}${suffix}`)),
        );

        if (splitRoleSiblings.length === 0) {
          return;
        }

        if (path.basename(moduleDirectory) !== moduleStem) {
          context.report({ node, messageId: 'flatSplitModule' });
          return;
        }

        if (!existsSync(path.join(moduleDirectory, 'index.ts'))) {
          context.report({ node, messageId: 'missingFolderIndex' });
        }
      },
    };
  },
};
