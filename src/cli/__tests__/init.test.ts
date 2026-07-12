import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { InitOptions } from '../init/index.js';
import { runInit } from '../init/index.js';

let consumerRoot = '';

beforeEach(() => {
  consumerRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-init-'));
  writeFileSync(path.join(consumerRoot, 'package.json'), JSON.stringify({ name: 'consumer' }, null, 2));
});

afterEach(() => {
  rmSync(consumerRoot, { recursive: true, force: true });
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
});
