import type { StackProfile } from '../profiles/profiles.types.js';
import type { RunnerAdapter } from '../runners/runners.types.js';

/**
 * A resolved scaffolding target within a project: the stack profile matched
 * for it and the directory (relative to `cwd`) its gate should run from.
 */
export interface Surface {
  /** Relative to `cwd`: `''` = flat project root, e.g. `'frontend'` = subdir. */
  readonly dir: string;
  readonly profile: StackProfile;
}

/**
 * The fully composed detection result `detect(cwd, override?)` produces —
 * always complete (MSI-DET-6): one runner, one profile, one surface in v1.
 */
export interface ProjectPlan {
  readonly cwd: string;
  readonly runner: RunnerAdapter;
  readonly surfaces: readonly Surface[];
}
