import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runInit } from '../init/index.js';

let consumerRoot = '';

beforeEach(() => {
  consumerRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-init-'));
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

  it('never overwrites an existing lefthook.yml', async () => {
    const existing = '# hand-tuned gate\npre-commit:\n  jobs: []\n';
    writeFileSync(path.join(consumerRoot, 'lefthook.yml'), existing);

    const result = await runInit({ cwd: consumerRoot });

    expect(result.created).not.toContain('lefthook.yml');
    expect(result.skipped).toContain('lefthook.yml');
    expect(readFileSync(path.join(consumerRoot, 'lefthook.yml'), 'utf8')).toBe(existing);
  });
});
