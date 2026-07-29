import type { RunnerName } from '../../runners/runners.types.js';
import { MUTATION_SCRIPT_NAME, MUTATION_TEMP_DIR } from '../mutation.constants.js';
import { renderGuard } from './templates.helpers.js';

/** Renders the generated artifacts for a portable, staged-line Stryker guard. */
export function renderMutationFiles(runner: RunnerName): readonly { readonly path: string; readonly content: string }[] {
  return [
    { path: 'scripts/dlinter-mutation-staged.mjs', content: renderGuard(runner) },
    {
      path: 'stryker.dlinter.json',
      content: `${JSON.stringify(
        {
          testRunner: 'vitest',
          plugins: ['@stryker-mutator/vitest-runner'],
          concurrency: 4,
          ignoreStatic: true,
          cleanTempDir: 'always',
          tempDirName: MUTATION_TEMP_DIR,
          reporters: ['clear-text'],
          thresholds: { high: 100, low: 100, break: 100 },
          vitest: { configFile: 'vitest.dlinter-mutation.mts' },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'vitest.dlinter-mutation.mts',
      content: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', '**/scripts/**', '**/${MUTATION_TEMP_DIR}/**'],
    deps: { optimizer: { client: { enabled: false }, ssr: { enabled: false } } },
  },
});
`,
    },
  ];
}

/** The script command rendered into package.json and Lefthook. */
export const mutationScript = `node ./scripts/dlinter-mutation-staged.mjs`;

/** The public mutation job descriptor. */
export const mutationJob = { name: MUTATION_SCRIPT_NAME, script: MUTATION_SCRIPT_NAME, run: MUTATION_SCRIPT_NAME };
