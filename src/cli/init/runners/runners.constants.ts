import type { RunnerAdapter } from './runners.types.js';

/**
 * Builds one adapter from the two facts that actually vary per runner: its
 * lockfile signatures and its one-off exec prefix (`bun x` / `pnpm exec` /
 * `yarn exec` / `npx`). Every runner shares the `<name> run <script>` form.
 * @param name - package-manager binary name, also the `run` prefix.
 * @param lockfiles - lockfile filenames that identify this runner.
 * @param execPrefix - command words that prefix a one-off binary invocation.
 * @returns the assembled adapter.
 */
const createAdapter = (
  name: RunnerAdapter['name'],
  lockfiles: readonly string[],
  execPrefix: readonly string[],
): RunnerAdapter => ({
  name,
  lockfiles,
  run: (script) => `${name} run ${script}`,
  exec: (bin, args = []) => [...execPrefix, bin, ...args].join(' '),
});

/**
 * Registered runner adapters, in detection precedence order (MSI-DET-1):
 * `bun.lock`/`bun.lockb` \> `pnpm-lock.yaml` \> `yarn.lock` \>
 * `package-lock.json`, with npm as the steady-state default when none match
 * (scanLockfiles falls back to the npm entry even when package-lock.json is
 * absent). Adding a fifth runner is one factory call — no branch changes.
 */
export const RUNNER_ADAPTERS: readonly RunnerAdapter[] = [
  createAdapter('bun', ['bun.lock', 'bun.lockb'], ['bun', 'x']),
  createAdapter('pnpm', ['pnpm-lock.yaml'], ['pnpm', 'exec']),
  createAdapter('yarn', ['yarn.lock'], ['yarn', 'exec']),
  createAdapter('npm', ['package-lock.json'], ['npx']),
];
