import { resolveProfile } from '../profiles/index.js';
import { resolveRunner } from '../runners/index.js';
import { resolveSurfaceDir } from './detect.helpers.js';
import type { ProjectPlan } from './detect.types.js';

/**
 * Composes runner detection (MSI-DET-1), stack-profile detection or the
 * `--profile` override (MSI-DET-2, MSI-DET-3), and surface resolution
 * (MSI-DET-4, MSI-DET-5) into one complete `ProjectPlan` (MSI-DET-6). A pure
 * read — `detect` never writes to disk.
 * @param cwd - project root to inspect.
 * @param override - explicit `--profile` id; skips profile detection when given.
 * @returns the composed project plan.
 */
export function detect(cwd: string, override?: string): ProjectPlan {
  const runner = resolveRunner(cwd);
  const profile = resolveProfile(cwd, override);
  const dir = resolveSurfaceDir(cwd, profile);

  return { cwd, runner, surfaces: [{ dir, profile }] };
}
