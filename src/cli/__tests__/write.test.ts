import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RenderedArtifacts } from '../init/render/render.types.js';
import { verifyMarkersSurvived } from '../init/merge/merge.helpers.js';
import { STATE_FILE_NAME } from '../init/merge/index.js';
import { writeArtifacts } from '../init/write/index.js';
import type { WriteResult } from '../init/write/index.js';

vi.mock('../init/merge/merge.helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../init/merge/merge.helpers.js')>();

  return { ...actual, verifyMarkersSurvived: vi.fn(actual.verifyMarkersSurvived) };
});

let cwd = '';

beforeEach(() => {
  cwd = mkdtempSync(path.join(tmpdir(), 'dlinter-write-'));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

/** A minimal, realistic ts-lib-shaped set of rendered artifacts. */
function buildArtifacts(overrides: Partial<RenderedArtifacts> = {}): RenderedArtifacts {
  return {
    lefthookJobs: [
      { name: 'fallow', run: 'bun x fallow audit --quiet' },
      { name: 'lint', run: 'bun run lint' },
      { name: 'typecheck', run: 'bun run typecheck' },
      { name: 'test', run: 'bun run test' },
    ],
    fallowFiles: [{ path: '.fallowrc.json', content: '{\n  "$schema": "https://example/schema.json"\n}\n' }],
    scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'vitest run' },
    eslintSnippet: "import { createRecommendedConfig } from 'dlinter-ts-react';\n",
    ...overrides,
  };
}

describe('writeArtifacts', () => {
  it('creates lefthook.yml, the fallow file, and every scaffolded script in a bare project', () => {
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'consumer' }, null, 2));

    const result: WriteResult = writeArtifacts(cwd, buildArtifacts());

    expect(result.created).toEqual(
      expect.arrayContaining([
        'lefthook.yml',
        '.fallowrc.json',
        'package.json:scripts.lint',
        'package.json:scripts.typecheck',
        'package.json:scripts.test',
      ]),
    );
    expect(result.merged).toEqual([]);
    expect(result.warnings).toEqual([]);

    const lefthook = readFileSync(path.join(cwd, 'lefthook.yml'), 'utf8');

    expect(lefthook).toContain('# dlinter:owned');
    expect(JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).toMatchObject({
      scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'vitest run' },
    });
  });

  it('leaves an existing .fallowrc.json untouched and reports it as skipped (MSI-OVR-1)', () => {
    const existing = '{"custom":true}\n';

    writeFileSync(path.join(cwd, 'package.json'), '{}');
    writeFileSync(path.join(cwd, '.fallowrc.json'), existing);

    const result = writeArtifacts(cwd, buildArtifacts());

    expect(result.skipped).toContain('.fallowrc.json');
    expect(result.created).not.toContain('.fallowrc.json');
    expect(readFileSync(path.join(cwd, '.fallowrc.json'), 'utf8')).toBe(existing);
  });

  it('merges dlinter jobs into an existing lefthook.yml, preserving foreign jobs, and reports merged (MSI-MRG-2)', () => {
    const foreign = 'pre-commit:\n  jobs:\n    # a hand-written job, no dlinter marker\n    - name: go-test\n      run: go test ./...\n';

    writeFileSync(path.join(cwd, 'lefthook.yml'), foreign);
    writeFileSync(path.join(cwd, 'package.json'), '{}');

    const result = writeArtifacts(cwd, buildArtifacts());

    expect(result.merged).toContain('lefthook.yml');
    expect(result.created).not.toContain('lefthook.yml');

    const lefthook = readFileSync(path.join(cwd, 'lefthook.yml'), 'utf8');

    expect(lefthook).toContain('run: go test ./...');
    expect(lefthook).toContain('# dlinter:owned');
  });

  it('reports a name-collision job as a warning without appending or overwriting the foreign job (MSI-MRG-4)', () => {
    const collision = 'pre-commit:\n  jobs:\n    - name: lint\n      run: npx eslint --fix .\n';

    writeFileSync(path.join(cwd, 'lefthook.yml'), collision);
    writeFileSync(path.join(cwd, 'package.json'), '{}');

    const result = writeArtifacts(cwd, buildArtifacts());

    expect(result.warnings.some((warning) => warning.includes('lefthook.yml') && warning.includes('lint'))).toBe(true);

    const lefthook = readFileSync(path.join(cwd, 'lefthook.yml'), 'utf8');

    expect(lefthook).toContain('run: npx eslint --fix .');
    expect(lefthook.match(/# dlinter:owned/g)).toHaveLength(3);
  });

  it('never modifies an existing script, and reports a conflict warning when its body differs (MSI-SCR-2, MSI-SCR-3)', () => {
    writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({ scripts: { lint: 'my-custom-lint-command', test: 'vitest run' } }, null, 2),
    );

    const result = writeArtifacts(cwd, buildArtifacts());

    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')) as { scripts: Record<string, string> };

    expect(pkg.scripts.lint).toBe('my-custom-lint-command');
    expect(pkg.scripts.test).toBe('vitest run');
    expect(result.skipped).toEqual(expect.arrayContaining(['package.json:scripts.lint', 'package.json:scripts.test']));
    expect(result.warnings.some((warning) => warning.includes('scripts.lint'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('scripts.test'))).toBe(false);
    expect(result.created).toContain('package.json:scripts.typecheck');
  });

  it('leaves package.json byte-untouched when every scaffolded script already exists', () => {
    const original = JSON.stringify({ scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'vitest run' } }, null, 2);

    writeFileSync(path.join(cwd, 'package.json'), original);

    writeArtifacts(cwd, buildArtifacts());

    expect(readFileSync(path.join(cwd, 'package.json'), 'utf8')).toBe(original);
  });

  it('writes .dlinter-init.json when merge falls back to state-file ownership (MSI-MRG-6)', () => {
    vi.mocked(verifyMarkersSurvived).mockReturnValueOnce(false);
    writeFileSync(path.join(cwd, 'package.json'), '{}');

    const result = writeArtifacts(cwd, buildArtifacts());

    expect(result.created).toContain(STATE_FILE_NAME);
    expect(existsSync(path.join(cwd, STATE_FILE_NAME))).toBe(true);

    const stateFile = JSON.parse(readFileSync(path.join(cwd, STATE_FILE_NAME), 'utf8')) as { lefthookJobs: string[] };

    expect(stateFile.lefthookJobs).toEqual(['fallow', 'lint', 'typecheck', 'test']);
  });

  it('running writeArtifacts twice on the same plan is idempotent — no duplicate jobs, no duplicate warnings', () => {
    writeFileSync(path.join(cwd, 'package.json'), '{}');

    writeArtifacts(cwd, buildArtifacts());
    const second = writeArtifacts(cwd, buildArtifacts());

    expect(second.merged).toContain('lefthook.yml');
    expect(second.warnings).toEqual([]);

    const lefthook = readFileSync(path.join(cwd, 'lefthook.yml'), 'utf8');

    expect(lefthook.match(/# dlinter:owned/g)).toHaveLength(4);
  });
});
