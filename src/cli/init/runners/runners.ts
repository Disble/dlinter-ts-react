import { readdirSync } from 'node:fs';

import { RUNNER_ADAPTERS } from './runners.constants.js';
import { scanLockfiles } from './runners.helpers.js';
import type { RunnerAdapter } from './runners.types.js';

/**
 * Detects the package manager in use at `cwd` by scanning its lockfiles
 * (MSI-DET-1) and returns the matching `RunnerAdapter`.
 * @param cwd - project root to inspect.
 * @returns the resolved runner adapter.
 */
export function resolveRunner(cwd: string): RunnerAdapter {
  const filenames = readdirSync(cwd);
  const name = scanLockfiles(filenames);
  const adapter = RUNNER_ADAPTERS.find((candidate) => candidate.name === name);

  if (!adapter) {
    // Invariant: RUNNER_ADAPTERS always registers an entry for every
    // RunnerName scanLockfiles can return (npm is the guaranteed fallback).
    throw new Error(`No RunnerAdapter registered for resolved runner "${name}".`);
  }

  return adapter;
}
