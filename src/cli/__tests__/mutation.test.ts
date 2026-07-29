import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectPlan } from '../init/detect/detect.types.js';
import { installMutationDependencies } from '../init/mutation/mutation.install.js';
import { validateMutationCapability } from '../init/mutation/mutation.validation.js';
import { STACK_PROFILES } from '../init/profiles/profiles.constants.js';
import { RUNNER_ADAPTERS } from '../init/runners/runners.constants.js';
import type { RunnerName } from '../init/runners/runners.types.js';
import { preflightCapabilities, writeFiles, writeGitignore } from '../init/write/write.helpers.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();

  return { ...actual, execFileSync: vi.fn() };
});

let cwd = '';

beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), 'dlinter-mutation-'));
  vi.mocked(execFileSync).mockClear();
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

function buildPlan(testMutator: boolean, surfaceDir = ''): ProjectPlan {
  const runner = RUNNER_ADAPTERS.find((candidate) => candidate.name === 'bun');
  const profile = STACK_PROFILES.find((candidate) => candidate.name === 'react-spa');

  if (!runner || !profile) {
    throw new Error('Test fixture setup failure: expected Bun runner and React SPA profile.');
  }

  return { cwd, runner, surfaces: [{ dir: surfaceDir, profile }], ...(testMutator ? { testMutator: true } : {}) };
}

describe('mutation capability', () => {
  it.each([
    ['bun', ['add', '--exact', '--dev', '@stryker-mutator/core@9.6.1', '@stryker-mutator/vitest-runner@9.6.1']],
    ['npm', ['install', '--save-dev', '--save-exact', '@stryker-mutator/core@9.6.1', '@stryker-mutator/vitest-runner@9.6.1']],
    ['pnpm', ['add', '--save-dev', '--save-exact', '@stryker-mutator/core@9.6.1', '@stryker-mutator/vitest-runner@9.6.1']],
    ['yarn', ['add', '--dev', '--exact', '@stryker-mutator/core@9.6.1', '@stryker-mutator/vitest-runner@9.6.1']],
  ] as const)('installs the exact Stryker dependencies with %s', (runner, args) => {
    installMutationDependencies(cwd, runner as RunnerName);

    expect(execFileSync).toHaveBeenCalledWith(runner, args, { cwd, stdio: 'inherit' });
  });

  it('accepts a disabled capability without reading the surface manifest', () => {
    expect(() => validateMutationCapability(buildPlan(false))).not.toThrow();
  });

  it.each([
    ['dependencies', { dependencies: { vitest: '4.1.10' } }],
    ['devDependencies', { devDependencies: { vitest: '4.1.10' } }],
  ])('accepts Vitest in %s', (_section, manifest) => {
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(manifest));

    expect(() => validateMutationCapability(buildPlan(true))).not.toThrow();
  });

  it('rejects missing manifests and manifests without Vitest', () => {
    expect(() => validateMutationCapability(buildPlan(true))).toThrow(/requires Vitest/);
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ devDependencies: { typescript: '5.0.0' } }));
    expect(() => validateMutationCapability(buildPlan(true))).toThrow(/requires Vitest/);
  });

  it('rejects a plan with no resolved surface', () => {
    expect(() => validateMutationCapability({ ...buildPlan(true), surfaces: [] })).toThrow('Cannot validate mutation capability');
  });

  it('writes matching capability files once and rejects changed existing content', () => {
    const files = [{ path: 'scripts/guard.mjs', content: 'generated\n' }];

    expect(writeFiles(cwd, files)).toEqual({ created: ['scripts/guard.mjs'], skipped: [], merged: [] });
    expect(writeFiles(cwd, files)).toEqual({ created: [], skipped: ['scripts/guard.mjs'], merged: [] });
    writeFileSync(path.join(cwd, 'scripts/guard.mjs'), 'custom\n');
    expect(() => writeFiles(cwd, files)).toThrow('scripts/guard.mjs already exists with different content');
  });

  it('rejects a changed capability file during preflight before it can be overwritten', () => {
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: {} }));
    writeFileSync(path.join(cwd, 'guard.mjs'), 'custom\n');

    expect(() => writeFiles(cwd, [{ path: 'guard.mjs', content: 'generated\n' }])).toThrow('guard.mjs already exists with different content');
  });

  it('preflights an identical capability file and rejects a changed one', () => {
    const file = { path: 'guard.mjs', content: 'generated\n' };
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: {} }));
    writeFileSync(path.join(cwd, file.path), file.content);

    expect(() => preflightCapabilities(cwd, '', [file], {}, [])).not.toThrow();
    writeFileSync(path.join(cwd, file.path), 'custom\n');
    expect(() => preflightCapabilities(cwd, '', [file], {}, [])).toThrow('guard.mjs already exists with different content');
  });

  it('accepts a matching required mutation script during preflight', () => {
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { 'test:mutation:staged': 'node guard.mjs' } }));

    expect(() => preflightCapabilities(cwd, '', [], { 'test:mutation:staged': 'node guard.mjs' }, [])).not.toThrow();
  });

  it('creates, merges, and idempotently skips scoped gitignore entries', () => {
    expect(writeGitignore(cwd, 'frontend', ['.dlinter-mutation-tmp/', 'coverage/'])).toEqual({ created: ['frontend/.gitignore'], skipped: [], merged: [] });
    expect(readFileSync(path.join(cwd, 'frontend/.gitignore'), 'utf8')).toBe('# dlinter: mutation testing runtime artifacts\n.dlinter-mutation-tmp/\ncoverage/\n');
    expect(writeGitignore(cwd, 'frontend', ['.dlinter-mutation-tmp/', 'coverage/'])).toEqual({ created: [], skipped: ['frontend/.gitignore'], merged: [] });
    expect(writeGitignore(cwd, 'frontend', ['reports/'])).toEqual({ created: [], skipped: [], merged: ['frontend/.gitignore'] });
    expect(readFileSync(path.join(cwd, 'frontend/.gitignore'), 'utf8')).toBe(
      '# dlinter: mutation testing runtime artifacts\n.dlinter-mutation-tmp/\ncoverage/\nreports/\n',
    );
    expect(writeGitignore(cwd, '', [])).toEqual({ created: [], skipped: [], merged: [] });
    expect(existsSync(path.join(cwd, '.gitignore'))).toBe(false);
  });

  it('preserves a root ignore file without a trailing newline when appending an entry', () => {
    writeFileSync(path.join(cwd, '.gitignore'), 'node_modules');

    expect(writeGitignore(cwd, '', ['.dlinter-mutation-tmp/'])).toEqual({ created: [], skipped: [], merged: ['.gitignore'] });
    expect(readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\n# dlinter: mutation testing runtime artifacts\n.dlinter-mutation-tmp/\n');
  });
});
