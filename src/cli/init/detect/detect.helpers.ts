import { existsSync } from 'node:fs';
import path from 'node:path';

import type { StackProfile } from '../profiles/profiles.types.js';

/**
 * Resolves a profile's actual surface directory against real disk state
 * (MSI-DET-4, MSI-DET-5). A profile with a flat `surfaceDir` (`''`) always
 * resolves to the project root. A non-flat `surfaceDir` (only
 * `wails-frontend` in v1) resolves to that subdir ONLY when it holds its own
 * `package.json` — otherwise the project is treated as flat rather than
 * failing detection.
 * @param cwd - project root to inspect.
 * @param profile - the resolved stack profile.
 * @returns the surface directory, relative to `cwd` (`''` = root).
 */
export function resolveSurfaceDir(cwd: string, profile: StackProfile): string {
  if (profile.surfaceDir === '') {
    return '';
  }

  const surfacePackageJson = path.join(cwd, profile.surfaceDir, 'package.json');

  return existsSync(surfacePackageJson) ? profile.surfaceDir : '';
}
