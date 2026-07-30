import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InitOptions } from '../init/index.js';
import { runInit } from '../init/index.js';
import { installMutationDependencies } from '../init/mutation/mutation.install.js';

vi.mock('../init/mutation/mutation.install.js', () => ({ installMutationDependencies: vi.fn() }));

let consumerRoot = '';

beforeEach(() => {
  consumerRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-init-'));
  writeFileSync(path.join(consumerRoot, 'package.json'), JSON.stringify({ name: 'consumer' }, null, 2));
});

afterEach(() => {
  rmSync(consumerRoot, { recursive: true, force: true });
  vi.mocked(installMutationDependencies).mockClear();
});

describe('dlinter init', () => {
  it('scaffolds a lefthook.yml pre-commit gate in a project without one', async () => {
    const result = await runInit({ cwd: consumerRoot });

    expect(result.created).toContain('lefthook.yml');

    const lefthook = readFileSync(path.join(consumerRoot, 'lefthook.yml'), 'utf8');
    expect(lefthook).toContain('pre-commit:');
    expect(lefthook).toContain('lint');
    expect(lefthook).toContain('typecheck');
    expect(lefthook).toContain('test');
    expect(installMutationDependencies).not.toHaveBeenCalled();
  });

  // ADR-6 — the one intentional breaking-behavior change of multi-stack-init:
  // an existing lefthook.yml is no longer skipped wholesale, it is additively
  // merged (MSI-MRG-2), preserving every foreign job byte-for-byte.
  it('additively merges dlinter jobs into an existing lefthook.yml, preserving foreign jobs (ADR-6, MSI-MRG-2)', async () => {
    const existing = '# hand-tuned gate\npre-commit:\n  jobs:\n    - name: hand-tuned\n      run: echo hi\n';
    writeFileSync(path.join(consumerRoot, 'lefthook.yml'), existing);

    const result = await runInit({ cwd: consumerRoot });

    expect(result.created).not.toContain('lefthook.yml');
    expect(result.merged).toContain('lefthook.yml');

    const lefthook = readFileSync(path.join(consumerRoot, 'lefthook.yml'), 'utf8');
    expect(lefthook).toContain('run: echo hi');
    expect(lefthook).toContain('# dlinter:owned');
  });

  it('reports the resolved plan for transparency (MSI-RES-4)', async () => {
    const result = await runInit({ cwd: consumerRoot });

    expect(result.resolvedPlan.profile).toBe('ts-lib');
    expect(result.resolvedPlan.surfaceDir).toBe('');
    expect(typeof result.resolvedPlan.runner).toBe('string');
  });

  it('uses the resolved Wails frontend surface lockfile for the gate runner', async () => {
    writeFileSync(path.join(consumerRoot, 'wails.json'), '{}\n');
    writeFileSync(path.join(consumerRoot, 'package-lock.json'), '{}\n');
    mkdirSync(path.join(consumerRoot, 'frontend'));
    writeFileSync(path.join(consumerRoot, 'frontend', 'package.json'), JSON.stringify({ name: 'frontend' }, null, 2));
    writeFileSync(path.join(consumerRoot, 'frontend', 'bun.lock'), '\n');

    const result = await runInit({ cwd: consumerRoot });

    expect(result.resolvedPlan).toEqual({ runner: 'bun', profile: 'wails-frontend', surfaceDir: 'frontend' });

    const lefthook = readFileSync(path.join(consumerRoot, 'lefthook.yml'), 'utf8');
    expect(lefthook).toContain('root: frontend');
    expect(lefthook).toContain('run: bun run lint');
  });

  it('honors an explicit --profile override instead of detecting (MSI-DET-3)', async () => {
    const options: InitOptions = { cwd: consumerRoot, profile: 'react-spa' };
    const result = await runInit(options);

    expect(result.resolvedPlan.profile).toBe('react-spa');
  });

  it('rejects an unknown --profile before writing any file (MSI-DET-3)', async () => {
    await expect(runInit({ cwd: consumerRoot, profile: 'not-a-real-profile' })).rejects.toThrow();

    expect(existsSync(path.join(consumerRoot, 'lefthook.yml'))).toBe(false);
  });

  it('surfaces the suggested ESLint snippet without writing it to disk (MSI-RES-3)', async () => {
    const result = await runInit({ cwd: consumerRoot });

    expect(result.eslintSnippet).toContain('createRecommendedConfig');
    expect(existsSync(path.join(consumerRoot, 'eslint.config.js'))).toBe(false);
  });

  it('scaffolds the local Vitest mutation guard with an isolated Git sandbox', async () => {
    writeFileSync(
      path.join(consumerRoot, 'package.json'),
      JSON.stringify({ name: 'consumer', devDependencies: { vitest: '4.1.10' } }, null, 2),
    );

    const result = await runInit({ cwd: consumerRoot, testMutator: true });

    expect(result.created).toEqual(
      expect.arrayContaining([
        'scripts/dlinter-mutation-staged.mjs',
        'stryker.dlinter.mjs',
        'vitest.dlinter-mutation.mts',
        'package.json:scripts.test:mutation:staged',
      ]),
    );
    expect(existsSync(path.join(consumerRoot, '.gitignore'))).toBe(false);
    expect(readFileSync(path.join(consumerRoot, 'lefthook.yml'), 'utf8')).toContain('test:mutation:staged');
    expect(installMutationDependencies).toHaveBeenCalledWith(consumerRoot, 'npm');
  });

  it('rejects --test-mutator without Vitest before writing files', async () => {
    await expect(runInit({ cwd: consumerRoot, testMutator: true })).rejects.toThrow(/requires Vitest/);

    expect(existsSync(path.join(consumerRoot, 'lefthook.yml'))).toBe(false);
    expect(installMutationDependencies).not.toHaveBeenCalled();
  });
});
