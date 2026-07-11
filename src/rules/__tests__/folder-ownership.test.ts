import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { folderOwnership } from '../folder-ownership/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'folder-ownership');

function fixture(relativePath: string) {
  const filename = path.join(fixtureRoot, relativePath);
  return { filename, code: readFileSync(filename, 'utf8') };
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('folder-ownership', folderOwnership, {
  valid: [
    {
      name: 'folder-owned module with role siblings and an index.ts entrypoint',
      ...fixture('green/clock/clock.ts'),
    },
    {
      name: 'module without role siblings owes no folder',
      ...fixture('plain/simple.ts'),
    },
    {
      name: 'role files themselves are outside the contract',
      ...fixture('green/clock/clock.helpers.ts'),
    },
    {
      name: 'index.ts entrypoints are outside the contract',
      ...fixture('green/clock/index.ts'),
    },
  ],
  invalid: [
    {
      name: 'flat module with role siblings must move into its own folder',
      ...fixture('flat-split/bridge-source.ts'),
      errors: [{ messageId: 'flatSplitModule' }],
    },
    {
      name: 'folder-owned module without index.ts must publish an entrypoint',
      ...fixture('missing-index/season/season.ts'),
      errors: [{ messageId: 'missingFolderIndex' }],
    },
  ],
});
