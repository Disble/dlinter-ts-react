import type { ProfileName } from './profiles/profiles.types.js';
import type { RunnerName } from './runners/runners.types.js';
import type { WriteResult } from './write/write.types.js';

/**
 * Target location + optional profile override for the init scaffolder.
 */
export interface InitOptions {
  readonly cwd: string;
  /** Explicit `--profile` id; skips stack-profile detection when given (MSI-DET-3). */
  readonly profile?: string;
  /** Scaffold the local staged-line mutation guard for a Vitest surface. */
  readonly testMutator?: boolean;
}

/**
 * The resolved detection summary surfaced for transparency (MSI-RES-4): what
 * `dlinter init` detected — or what `--profile` forced — so a misdetection
 * is visible and actionable rather than silent.
 */
export interface ResolvedPlanSummary {
  readonly runner: RunnerName;
  readonly profile: ProfileName;
  /** Relative to `cwd`: `''` = flat project root, e.g. `'frontend'` = subdir. */
  readonly surfaceDir: string;
}

/**
 * Outcome of an init run (MSI-RES-1..4): every file/script outcome from
 * `writeArtifacts`, the advisory ESLint snippet, and the resolved plan.
 */
export interface InitResult extends WriteResult {
  /** Suggested `eslint.config.js` addition — surfaced, never written (MSI-REN-5, MSI-RES-3). */
  readonly eslintSnippet: string;
  readonly resolvedPlan: ResolvedPlanSummary;
}
