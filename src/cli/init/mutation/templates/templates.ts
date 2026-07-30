import { MUTATION_SCRIPT_NAME } from '../mutation.constants.js';
import { renderGuard } from './templates.helpers.js';

/** Renders the generated artifacts for a portable, staged-line Stryker guard. */
export function renderMutationFiles(configFile?: string): readonly { readonly path: string; readonly content: string }[] {
  return [
    { path: 'scripts/dlinter-mutation-staged.mjs', content: renderGuard() },
    {
      path: 'stryker.dlinter.mjs',
      content: `import { execFileSync } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();
const gitCommonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd, encoding: 'utf8' }).trim();

export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  concurrency: 4,
  ignoreStatic: true,
  cleanTempDir: 'always',
  tempDirName: path.join(gitCommonDir, 'dlinter', '.dlinter-mutation-tmp'),
  reporters: ['clear-text'],
  thresholds: { high: 80, low: 80, break: 80 },
  vitest: { configFile: 'vitest.dlinter-mutation.mts' },
};
`,
    },
    {
      path: 'vitest.dlinter-mutation.mts',
      content: configFile
        ? `import { mergeConfig } from 'vitest/config';
import projectConfig from './${configFile}';

export default (environment) =>
  mergeConfig(typeof projectConfig === 'function' ? projectConfig(environment) : projectConfig, {
    test: {
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['scripts/**', '**/scripts/**'],
      deps: { optimizer: { client: { enabled: false }, ssr: { enabled: false } } },
    },
  });
`
        : `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', '**/scripts/**'],
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
