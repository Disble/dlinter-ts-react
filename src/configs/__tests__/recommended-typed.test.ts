import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createRecommendedConfig } from '../recommended/index.js';

// Type-checked rules need a real TypeScript program, so this suite lints a
// fixture project on disk (its own tsconfig.json, discovered by the project
// service) instead of the virtual-file harness used by recommended.test.ts.
const fixtureRoot = fileURLToPath(new URL('./__fixtures__/typed-project/', import.meta.url));

function createTypedEslint(): ESLint {
  return new ESLint({
    cwd: fixtureRoot,
    overrideConfigFile: true,
    overrideConfig: [
      ...createRecommendedConfig(),
      {
        settings: {
          react: { version: '19.2' },
        },
      },
    ],
  });
}

async function lintFixtureFile(relativePath: string) {
  const eslint = createTypedEslint();
  const results = await eslint.lintFiles([relativePath]);
  return results.flatMap((result) => result.messages);
}

describe('recommended config — type-checked rules (real fixture project)', () => {
  it('flags a floating promise in production source as an error', async () => {
    const messages = await lintFixtureFile('src/features/demo/save-user.ts');
    const errorIds = messages
      .filter((message) => message.severity === 2)
      .map((message) => message.ruleId ?? '');

    expect(errorIds).toContain('@typescript-eslint/no-floating-promises');
  });

  it('keeps a compliant async module green', async () => {
    const messages = await lintFixtureFile('src/features/demo/read-user.ts');
    const errors = messages.filter((message) => message.severity === 2);

    expect(errors).toEqual([]);
  });
});
