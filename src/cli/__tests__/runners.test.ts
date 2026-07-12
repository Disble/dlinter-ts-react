import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRunner } from '../init/runners/index.js';
import { RUNNER_ADAPTERS } from '../init/runners/runners.constants.js';
import { scanLockfiles } from '../init/runners/runners.helpers.js';

describe('RUNNER_ADAPTERS', () => {
  it('registers exactly 4 unique adapters in bun > pnpm > yarn > npm precedence order', () => {
    const names = RUNNER_ADAPTERS.map((adapter) => adapter.name);

    expect(names).toEqual(['bun', 'pnpm', 'yarn', 'npm']);
    expect(new Set(names).size).toBe(4);
  });

  it('renders each adapter run(script) as its package-manager script invocation', () => {
    const runByName = Object.fromEntries(
      RUNNER_ADAPTERS.map((adapter) => [adapter.name, adapter.run('lint')]),
    );

    expect(runByName['bun']).toBe('bun run lint');
    expect(runByName['pnpm']).toBe('pnpm run lint');
    expect(runByName['yarn']).toBe('yarn run lint');
    expect(runByName['npm']).toBe('npm run lint');
  });

  it('renders each adapter exec(bin, args) as a one-off binary invocation', () => {
    const execByName = Object.fromEntries(
      RUNNER_ADAPTERS.map((adapter) => [adapter.name, adapter.exec('fallow', ['audit', '--quiet'])]),
    );

    expect(execByName['bun']).toBe('bun x fallow audit --quiet');
    expect(execByName['pnpm']).toBe('pnpm exec fallow audit --quiet');
    expect(execByName['yarn']).toBe('yarn exec fallow audit --quiet');
    expect(execByName['npm']).toBe('npx fallow audit --quiet');
  });

  it('renders exec(bin) with no args as a bare binary invocation', () => {
    const bunAdapter = RUNNER_ADAPTERS.find((adapter) => adapter.name === 'bun');

    expect(bunAdapter?.exec('fallow')).toBe('bun x fallow');
  });
});

describe('scanLockfiles', () => {
  it('resolves bun for bun.lock', () => {
    expect(scanLockfiles(['bun.lock', 'package.json'])).toBe('bun');
  });

  it('resolves bun for bun.lockb', () => {
    expect(scanLockfiles(['bun.lockb', 'package.json'])).toBe('bun');
  });

  it('prefers bun over pnpm when both lockfiles are present', () => {
    expect(scanLockfiles(['bun.lock', 'pnpm-lock.yaml'])).toBe('bun');
  });

  it('resolves pnpm for pnpm-lock.yaml', () => {
    expect(scanLockfiles(['pnpm-lock.yaml', 'package.json'])).toBe('pnpm');
  });

  it('prefers pnpm over yarn when both lockfiles are present', () => {
    expect(scanLockfiles(['pnpm-lock.yaml', 'yarn.lock'])).toBe('pnpm');
  });

  it('resolves yarn for yarn.lock', () => {
    expect(scanLockfiles(['yarn.lock', 'package.json'])).toBe('yarn');
  });

  it('prefers yarn over npm when both lockfiles are present', () => {
    expect(scanLockfiles(['yarn.lock', 'package-lock.json'])).toBe('yarn');
  });

  it('resolves npm for package-lock.json', () => {
    expect(scanLockfiles(['package-lock.json', 'package.json'])).toBe('npm');
  });

  it('defaults to npm when no lockfile is present', () => {
    expect(scanLockfiles(['package.json'])).toBe('npm');
  });

  it('defaults to npm for an empty filename list', () => {
    expect(scanLockfiles([])).toBe('npm');
  });
});

describe('resolveRunner', () => {
  let projectRoot = '';

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-runners-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('resolves the RunnerAdapter matching the real lockfile on disk', () => {
    writeFileSync(path.join(projectRoot, 'pnpm-lock.yaml'), '');

    expect(resolveRunner(projectRoot).name).toBe('pnpm');
  });

  it('defaults to npm when the directory has no lockfile', () => {
    writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    expect(resolveRunner(projectRoot).name).toBe('npm');
  });
});
