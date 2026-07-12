import { RUNNER_ADAPTERS } from './runners.constants.js';
import type { RunnerName } from './runners.types.js';

/**
 * Resolves the runner from a plain list of filenames present in a directory
 * — no filesystem access. Scans `RUNNER_ADAPTERS` in precedence order and
 * returns the first adapter whose lockfile is present; no match (including an
 * empty list) defaults to npm (MSI-DET-1).
 * @param filenames - directory entries to scan for a lockfile match.
 * @returns the resolved runner's name.
 */
export function scanLockfiles(filenames: readonly string[]): RunnerName {
  for (const adapter of RUNNER_ADAPTERS) {
    if (adapter.lockfiles.some((lockfile) => filenames.includes(lockfile))) {
      return adapter.name;
    }
  }

  return 'npm';
}
