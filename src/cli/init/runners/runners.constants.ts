import type { RunnerAdapter } from './runners.types.js';

/**
 * Registered runner adapters, in detection precedence order (MSI-DET-1):
 * `bun.lock`/`bun.lockb` \> `pnpm-lock.yaml` \> `yarn.lock` \>
 * `package-lock.json`, with npm as the steady-state default when none match.
 * Adding a fifth runner is one array entry — no branch anywhere else changes.
 */
export const RUNNER_ADAPTERS: readonly RunnerAdapter[] = [
  {
    name: 'bun',
    lockfiles: ['bun.lock', 'bun.lockb'],
    run: (script) => `bun run ${script}`,
    exec: (bin, args = []) => ['bun', 'x', bin, ...args].join(' '),
  },
  {
    name: 'pnpm',
    lockfiles: ['pnpm-lock.yaml'],
    run: (script) => `pnpm run ${script}`,
    exec: (bin, args = []) => ['pnpm', 'exec', bin, ...args].join(' '),
  },
  {
    name: 'yarn',
    lockfiles: ['yarn.lock'],
    run: (script) => `yarn run ${script}`,
    exec: (bin, args = []) => ['yarn', 'exec', bin, ...args].join(' '),
  },
  {
    name: 'npm',
    // No lockfile at all is npm's own steady state (MSI-DET-1) — scanLockfiles
    // falls back to this entry even when package-lock.json is absent.
    lockfiles: ['package-lock.json'],
    run: (script) => `npm run ${script}`,
    exec: (bin, args = []) => ['npx', bin, ...args].join(' '),
  },
];
