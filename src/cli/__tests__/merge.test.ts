import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { mergeLefthookJobs, STATE_FILE_NAME } from '../init/merge/index.js';
import type { MergeJob, MergeOutcome, MergeStateFile, MergeWarning, OwnershipMode } from '../init/merge/index.js';
import { verifyMarkersSurvived } from '../init/merge/merge.helpers.js';

vi.mock('../init/merge/merge.helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../init/merge/merge.helpers.js')>();

  return { ...actual, verifyMarkersSurvived: vi.fn(actual.verifyMarkersSurvived) };
});

const fixturesDir = new URL('./fixtures/merge/', import.meta.url);

function loadFixture(fileName: string): string {
  return readFileSync(new URL(fileName, fixturesDir), 'utf8');
}

/** The 4 gate jobs `render` (PR-3) always produces (MSI-REN-1) — merge does not depend on render's types. */
const DLINTER_JOBS: readonly MergeJob[] = [
  { name: 'fallow', run: 'bun x fallow audit --quiet' },
  { name: 'lint', run: 'bun run lint' },
  { name: 'typecheck', run: 'bun run typecheck' },
  { name: 'test', run: 'bun run test' },
];

describe('mergeLefthookJobs', () => {
  it('creates a fresh lefthook.yml with every job marked dlinter-owned when none exists', () => {
    const outcome: MergeOutcome = mergeLefthookJobs(null, DLINTER_JOBS);
    const ownership: OwnershipMode = outcome.ownership;

    expect(outcome.mode).toBe('created');
    expect(ownership).toBe('comment');
    expect(outcome.warnings).toEqual([]);
    expect(outcome.text.match(/# dlinter:owned/g)).toHaveLength(DLINTER_JOBS.length);
  });

  it('running merge twice on the same real-world fixture produces byte-identical output (MSI-MRG-1)', () => {
    const fixture = loadFixture('autoreas-bridge-style.yml');

    const first = mergeLefthookJobs(fixture, DLINTER_JOBS);
    const second = mergeLefthookJobs(first.text, DLINTER_JOBS);

    expect(second.text).toBe(first.text);
    expect(second.warnings).toEqual([]);
  });

  it('preserves every foreign job byte-for-byte: names, run commands, comments, blank lines, position (MSI-MRG-2, MSI-MRG-5)', () => {
    const fixture = loadFixture('autoreas-bridge-style.yml');

    const { text } = mergeLefthookJobs(fixture, DLINTER_JOBS);

    // The entire original fixture (minus its trailing newline) must appear
    // verbatim, unmodified, before dlinter's appended jobs — this is the
    // fixture-driven proof MSI-MRG-5 requires, not an assumption.
    expect(text.startsWith(fixture.trimEnd())).toBe(true);
  });

  it('treats a same-name job without the ownership marker as a conflict, never as an overwrite (MSI-MRG-4)', () => {
    const fixture = loadFixture('name-collision.yml');

    const { text, warnings } = mergeLefthookJobs(fixture, DLINTER_JOBS);
    const expectedWarnings: readonly MergeWarning[] = [
      { kind: 'name-collision', job: 'lint' },
      { kind: 'name-collision', job: 'test' },
    ];

    expect(warnings).toEqual(expectedWarnings);
    expect(text).toContain('run: npx eslint . --max-warnings=0');
    expect(text).toContain('run: go test ./...');
    // Only fallow + typecheck (no name collision) got appended for dlinter.
    expect(text.match(/# dlinter:owned/g)).toHaveLength(2);
  });

  it('carries a job\'s root key when rendered, and drops it on a later merge that no longer sets one', () => {
    const withRoot = mergeLefthookJobs(null, [{ name: 'fallow', run: 'bun --cwd=frontend run audit', root: 'frontend' }]);

    expect(withRoot.text).toContain('root: frontend');

    const withoutRoot = mergeLefthookJobs(withRoot.text, [{ name: 'fallow', run: 'bun run audit' }]);

    expect(withoutRoot.text).not.toContain('root:');
  });

  it('falls back to a dlinter-owned state file when the ownership marker fails a post-write survival check (MSI-MRG-6)', () => {
    vi.mocked(verifyMarkersSurvived).mockReturnValueOnce(false);

    const { ownership, stateFile } = mergeLefthookJobs(null, DLINTER_JOBS);
    const expectedStateFile: MergeStateFile = { version: 1, lefthookJobs: ['fallow', 'lint', 'typecheck', 'test'] };

    expect(ownership).toBe('state-file');
    expect(stateFile).toEqual(expectedStateFile);
    // `write` (PR-4b) persists `stateFile` under this exact, single-source name.
    expect(STATE_FILE_NAME).toBe('.dlinter-init.json');
  });
});
