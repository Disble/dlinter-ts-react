import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { InitResult } from '../init/index.js';
import { formatInitResult, isProcessEntrypoint, parseProfileFlag } from '../index.js';

/** A minimal, realistic InitResult for formatting assertions. */
function buildResult(overrides: Partial<InitResult> = {}): InitResult {
  return {
    created: [],
    skipped: [],
    merged: [],
    warnings: [],
    eslintSnippet: '',
    resolvedPlan: { runner: 'bun', profile: 'ts-lib', surfaceDir: '' },
    ...overrides,
  };
}

describe('isProcessEntrypoint', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dlinter-entrypoint-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('is true when the bin was invoked through a symlink to the module (the npm .bin case)', () => {
    // npm links `node_modules/.bin/dlinter` -> the real dist entry; argv[1] is
    // the symlink, import.meta.url is the resolved real file. A raw `===` of
    // the two paths is false on Linux/macOS, silently disabling the CLI.
    const realEntry = path.join(dir, 'index.mjs');
    const binSymlink = path.join(dir, 'dlinter');

    writeFileSync(realEntry, '// entry\n');
    symlinkSync(realEntry, binSymlink, 'file');

    expect(isProcessEntrypoint(pathToFileURL(realEntry).href, binSymlink)).toBe(true);
  });

  it('is true when invoked directly by its real path', () => {
    const realEntry = path.join(dir, 'index.mjs');

    writeFileSync(realEntry, '// entry\n');

    expect(isProcessEntrypoint(pathToFileURL(realEntry).href, realEntry)).toBe(true);
  });

  it('is false when the module is merely imported (no argv[1]) or a different file ran', () => {
    const realEntry = path.join(dir, 'index.mjs');
    const other = path.join(dir, 'other.mjs');

    writeFileSync(realEntry, '// entry\n');
    writeFileSync(other, '// other\n');

    expect(isProcessEntrypoint(pathToFileURL(realEntry).href, undefined)).toBe(false);
    expect(isProcessEntrypoint(pathToFileURL(realEntry).href, other)).toBe(false);
  });
});

describe('parseProfileFlag', () => {
  it('returns undefined when --profile is absent', () => {
    expect(parseProfileFlag([])).toBeUndefined();
    expect(parseProfileFlag(['--help'])).toBeUndefined();
  });

  it('extracts the value immediately following --profile (MSI-DET-3)', () => {
    expect(parseProfileFlag(['--profile', 'react-spa'])).toBe('react-spa');
  });

  it('rejects a --profile flag with no following value', () => {
    expect(() => parseProfileFlag(['--profile'])).toThrow(/requires a value/);
  });
});

describe('formatInitResult', () => {
  it('prints the resolved plan first, using "." for a flat surface (MSI-RES-4)', () => {
    const lines = formatInitResult(buildResult());

    expect(lines[0]).toBe('detected: runner=bun profile=ts-lib surface=.');
  });

  it('prints a non-root surface dir as-is', () => {
    const lines = formatInitResult(buildResult({ resolvedPlan: { runner: 'npm', profile: 'wails-frontend', surfaceDir: 'frontend' } }));

    expect(lines[0]).toBe('detected: runner=npm profile=wails-frontend surface=frontend');
  });

  it('prints created/merged/skipped/warning lines for every reported outcome (MSI-RES-1, MSI-RES-2)', () => {
    const lines = formatInitResult(
      buildResult({
        created: ['lefthook.yml'],
        merged: ['.dlinter-init.json'],
        skipped: ['.fallowrc.json'],
        warnings: ['lefthook.yml: job "lint" already exists without the dlinter ownership marker — left untouched'],
      }),
    );

    expect(lines).toEqual(
      expect.arrayContaining([
        'created lefthook.yml',
        'merged .dlinter-init.json (added missing dlinter-owned jobs)',
        'skipped .fallowrc.json (already exists)',
        'warning: lefthook.yml: job "lint" already exists without the dlinter ownership marker — left untouched',
      ]),
    );
  });

  it('appends the suggested ESLint snippet only when present (MSI-RES-3)', () => {
    const withSnippet = formatInitResult(buildResult({ eslintSnippet: "export default [];\n" }));
    expect(withSnippet).toContain('suggested eslint.config.js addition:');
    expect(withSnippet).toContain('export default [];\n');

    const withoutSnippet = formatInitResult(buildResult());
    expect(withoutSnippet.some((line) => line.includes('suggested'))).toBe(false);
  });
});
