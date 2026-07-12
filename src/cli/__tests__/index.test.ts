import { describe, expect, it } from 'vitest';

import type { InitResult } from '../init/index.js';
import { formatInitResult, parseProfileFlag } from '../index.js';

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
