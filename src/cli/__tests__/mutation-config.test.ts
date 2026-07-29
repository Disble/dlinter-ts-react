import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runInit } from '../init/index.js';
import { installMutationDependencies } from '../init/mutation/mutation.install.js';

vi.mock('../init/mutation/mutation.install.js', () => ({ installMutationDependencies: vi.fn() }));

let consumerRoot = '';

beforeEach(() => {
  consumerRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-mutation-config-'));
  mkdirSync(path.join(consumerRoot, 'frontend'));
  writeFileSync(path.join(consumerRoot, 'wails.json'), '{}\n');
  writeFileSync(path.join(consumerRoot, 'frontend', 'package.json'), JSON.stringify({ devDependencies: { vitest: '4.1.10' } }));
});

afterEach(() => {
  rmSync(consumerRoot, { recursive: true, force: true });
  vi.mocked(installMutationDependencies).mockClear();
});

describe('mutation configuration', () => {
  it.each(['vitest.config.ts', 'vite.config.ts'])(
    'extends a functional frontend %s while retaining the mutation test constraints',
    async (configFile) => {
      writeFileSync(
        path.join(consumerRoot, 'frontend', configFile),
        "export default (environment) => ({ define: { __MODE__: JSON.stringify(environment.mode) } });\n",
      );

      const result = await runInit({ cwd: consumerRoot, testMutator: true });

      expect(result.resolvedPlan).toEqual({ runner: 'npm', profile: 'wails-frontend', surfaceDir: 'frontend' });
      expect(result.created).toContain('frontend/vitest.dlinter-mutation.mts');
      expect(readFileSync(path.join(consumerRoot, 'frontend', 'vitest.dlinter-mutation.mts'), 'utf8')).toBe(`import { mergeConfig } from 'vitest/config';
import projectConfig from './${configFile}';

export default (environment) =>
  mergeConfig(typeof projectConfig === 'function' ? projectConfig(environment) : projectConfig, {
    test: {
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['scripts/**', '**/scripts/**', '**/.dlinter-mutation-tmp/**'],
      deps: { optimizer: { client: { enabled: false }, ssr: { enabled: false } } },
    },
  });
`);
      expect(JSON.parse(readFileSync(path.join(consumerRoot, 'frontend', 'stryker.dlinter.json'), 'utf8'))).toMatchObject({
        thresholds: { high: 80, low: 80, break: 80 },
      });
    },
  );
});
