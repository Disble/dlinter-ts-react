import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { RUNNER_ADAPTERS } from '../init/runners/runners.constants.js';

function isBinaryAvailable(name: string): boolean {
  try {
    execSync(`${name} --version`, { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}

/**
 * MSI-REN-2 chose lefthook's native per-job `root:` key over baking a
 * subdirectory flag into each adapter's `run()` string (ADR-3). This proves
 * that choice is runner-correct for real: executing `adapter.run(script)`
 * with `cwd` set to a subdirectory — exactly what lefthook's `root:` does
 * before invoking the job — actually runs that subdirectory's own script,
 * for every registered runner.
 */
describe('RunnerAdapter.run — executable round-trip proof (MSI-REN-2)', () => {
  it.each(RUNNER_ADAPTERS)(
    "$name's run(script) executes inside a subdirectory the same way lefthook's root: key would invoke it",
    (adapter) => {
      if (!isBinaryAvailable(adapter.name)) {
        // Guard (T-3.2): skip runners not installed in this environment
        // rather than failing CI on an unrelated toolchain gap. bun/npm are
        // always available in this repo's own toolchain; pnpm/yarn are
        // conditionally verified.
        return;
      }

      const projectRoot = mkdtempSync(path.join(tmpdir(), `dlinter-runner-exec-${adapter.name}-`));
      const subdir = path.join(projectRoot, 'frontend');

      try {
        mkdirSync(subdir, { recursive: true });
        writeFileSync(
          path.join(subdir, 'package.json'),
          JSON.stringify({
            name: 'dlinter-runner-exec-probe',
            version: '1.0.0',
            private: true,
            scripts: {
              // Writes a marker file relative to the process cwd — proves
              // the command actually ran INSIDE `subdir`, not the parent.
              probe: `node -e "require('fs').writeFileSync('probe.txt', 'ok')"`,
            },
          }),
        );

        if (adapter.name === 'yarn') {
          // yarn berry (v4, the only yarn available in this dev environment
          // via Volta) refuses to run a script for a workspace absent from
          // its lockfile: `yarn run probe` fails with "doesn't seem to be
          // present in your lockfile" until `yarn install` has resolved it
          // at least once, even with zero dependencies (verified manually).
          // DEFERRED: yarn CLASSIC (v1) `run` semantics are NOT verified
          // here — only berry is installed locally. Classic's `run` syntax
          // is documented as identical (`yarn run <script>`), but this test
          // cannot prove it in this environment; confirm separately before
          // relying on yarn-classic consumers.
          execSync('yarn install', { cwd: subdir, stdio: 'ignore' });
        }

        execSync(adapter.run('probe'), { cwd: subdir, stdio: 'ignore' });

        expect(readFileSync(path.join(subdir, 'probe.txt'), 'utf8')).toBe('ok');
      } finally {
        rmSync(projectRoot, { recursive: true, force: true });
      }
    },
  );
});
