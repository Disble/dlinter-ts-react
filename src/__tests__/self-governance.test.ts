import { fileURLToPath } from 'node:url';

import tsParser from '@typescript-eslint/parser';
import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import { describe, expect, it } from 'vitest';

import { documentationContexts } from '../configs/recommended/recommended.constants.js';
import { pluginBase } from '../plugin.js';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const testGlobs = ['src/**/__tests__/**'];
const roleFileGlobs = [
  'src/**/*.constants.ts',
  'src/**/*.helpers.ts',
  'src/**/*.schema.ts',
  'src/**/*.types.ts',
];
// Package entrypoints declared in package.json (`main`, `bin`) compose the
// public surface — they are entry modules, not re-export barrels.
const packageEntrypoints = ['src/index.ts', 'src/cli/index.ts'];

// The universal (framework-agnostic) subset of the package's own governance,
// applied to this repository: colocation, folder ownership, pure barrels,
// documentation, and module size. React-layer rules are out of scope here.
const selfGovernanceConfig: Linter.Config[] = [
  {
    ignores: [...testGlobs, 'src/**/*.d.ts'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      dlinter: pluginBase,
      jsdoc: jsdocPlugin,
    },
    rules: {
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: documentationContexts,
          exemptEmptyConstructors: false,
          publicOnly: false,
          require: {
            ClassDeclaration: false,
            ClassExpression: false,
            FunctionDeclaration: false,
            MethodDefinition: false,
          },
        },
      ],
      'dlinter/require-exported-variable-jsdoc': 'error',
      'dlinter/folder-ownership': 'error',
    },
  },
  // Declaration ownership for every main module. `exported-const` stays off
  // repo-wide: the ESLint plugin contract requires rule modules and the plugin
  // base to be exported const objects, never function declarations.
  {
    files: ['src/**/*.ts'],
    ignores: [...roleFileGlobs, 'src/**/index.ts'],
    rules: {
      'dlinter/strict-colocation': [
        'error',
        {
          checks: [
            'root-variable',
            'root-helper-function',
            'default-arrow-export',
            'inline-interface',
            'inline-type-alias',
            'zod-import',
          ],
        },
      ],
    },
  },
  // Helpers own functions but never root-level constants/state nor inline types.
  {
    files: ['src/**/*.helpers.ts'],
    rules: {
      'dlinter/strict-colocation': [
        'error',
        { checks: ['root-variable', 'inline-interface', 'inline-type-alias'] },
      ],
    },
  },
  {
    files: ['src/**/index.ts'],
    ignores: packageEntrypoints,
    rules: {
      'dlinter/pure-index-barrel': 'error',
    },
  },
  // Layer contract — the import direction is one-way:
  //   src/index.ts → configs/ → plugin.ts → rules/    (cli/ is standalone)
  {
    files: ['src/rules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/configs/**', '**/plugin.js', '**/cli/**', '../index.js', '../../index.js'],
              message:
                'Layer contract: rules are the leaf layer — they never import configs, the plugin core, the cli, or the package entrypoint.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/plugin.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/configs/**', '**/cli/**', './index.js'],
              message:
                'Layer contract: the plugin core composes rules only — configs receive pluginBase, never the other way around.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/configs/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/rules/**', '**/cli/**', '../index.js', '../../index.js'],
              message:
                'Layer contract: configs consume the rule registry through pluginBase and never import the package entrypoint back (module cycle).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/rules/**', '**/configs/**', '**/plugin.js', '../index.js'],
              message:
                'Layer contract: the cli is a standalone bin entrypoint — it scaffolds files and never touches the plugin side.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/cli/**'],
              message:
                'Layer contract: the package entrypoint composes configs and the plugin — the cli is a separate bin entry.',
            },
          ],
        },
      ],
    },
  },
];

function createSelfGovernanceEslint(): ESLint {
  return new ESLint({
    cwd: repoRoot,
    overrideConfigFile: true,
    overrideConfig: selfGovernanceConfig,
  });
}

async function boundaryViolationsFor(code: string, filePath: string): Promise<readonly string[]> {
  const eslint = createSelfGovernanceEslint();
  const [result] = await eslint.lintText(code, { filePath });

  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
}

describe('self-governance', () => {
  it('the package source passes its own architecture rules', async () => {
    const eslint = createSelfGovernanceEslint();

    const results = await eslint.lintFiles(['src/**/*.ts']);
    const violations = results.flatMap((result) =>
      result.messages
        .filter((message) => message.severity === 2)
        .map(
          (message) =>
            `${result.filePath.slice(repoRoot.length)}:${message.line} [${message.ruleId}] ${message.message}`,
        ),
    );

    expect(violations).toEqual([]);
  });

  describe('layer boundaries', () => {
    it('rules are the leaf layer: they cannot import configs, the plugin, or the cli', async () => {
      expect(
        await boundaryViolationsFor(
          `import { createRecommendedConfig } from '../../configs/recommended/index.js';`,
          'src/rules/example/example.ts',
        ),
      ).not.toEqual([]);
      expect(
        await boundaryViolationsFor(
          `import { pluginBase } from '../../plugin.js';`,
          'src/rules/example/example.ts',
        ),
      ).not.toEqual([]);
    });

    it('the plugin composes rules only: it cannot import configs', async () => {
      expect(
        await boundaryViolationsFor(
          `import { createDumbUiConfig } from './configs/dumb-ui.js';`,
          'src/plugin.ts',
        ),
      ).not.toEqual([]);
    });

    it('configs consume rules through pluginBase: they cannot import rules or the entrypoint', async () => {
      expect(
        await boundaryViolationsFor(
          `import { strictColocation } from '../rules/strict-colocation/index.js';`,
          'src/configs/example.ts',
        ),
      ).not.toEqual([]);
      expect(
        await boundaryViolationsFor(`import dlinter from '../index.js';`, 'src/configs/example.ts'),
      ).not.toEqual([]);
    });

    it('the cli is a standalone entrypoint: it cannot import the plugin side', async () => {
      expect(
        await boundaryViolationsFor(`import { pluginBase } from '../plugin.js';`, 'src/cli/example.ts'),
      ).not.toEqual([]);
      expect(
        await boundaryViolationsFor(
          `import { rules } from '../rules/strict-colocation/index.js';`,
          'src/cli/example.ts',
        ),
      ).not.toEqual([]);
    });

    it('the package entrypoint never reaches into the cli bin', async () => {
      expect(
        await boundaryViolationsFor(`import { runInit } from './cli/init/index.js';`, 'src/index.ts'),
      ).not.toEqual([]);
    });

    it('the legal import direction stays open', async () => {
      expect(
        await boundaryViolationsFor(`import { pluginBase } from '../../plugin.js';`, 'src/configs/recommended/example.ts'),
      ).toEqual([]);
      expect(
        await boundaryViolationsFor(
          `import { strictColocation } from './rules/strict-colocation/index.js';`,
          'src/plugin.ts',
        ),
      ).toEqual([]);
    });
  });
});
