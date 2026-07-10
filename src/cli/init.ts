import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { InitOptions, InitResult } from './init.types.js';

const lefthookTemplate = `pre-commit:
  parallel: false
  jobs:
    - name: lint
      run: npx eslint .

    - name: typecheck
      run: npx tsc --noEmit

    - name: test
      run: npm run test
`;

/**
 * Scaffolds the dlinter pre-commit gate into a consumer project. Existing
 * files are never overwritten — a hand-tuned gate always wins over the template.
 * @param options - target project location.
 * @returns which files were created and which were left untouched.
 */
export async function runInit({ cwd }: InitOptions): Promise<InitResult> {
  const created: string[] = [];
  const skipped: string[] = [];
  const lefthookPath = path.join(cwd, 'lefthook.yml');

  if (existsSync(lefthookPath)) {
    skipped.push('lefthook.yml');
  } else {
    writeFileSync(lefthookPath, lefthookTemplate);
    created.push('lefthook.yml');
  }

  return { created, skipped };
}
