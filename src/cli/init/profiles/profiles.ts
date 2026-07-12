import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { STACK_PROFILES } from './profiles.constants.js';
import { matchProfile } from './profiles.helpers.js';
import type { DetectionInput, StackProfile } from './profiles.types.js';

/**
 * Resolves the stack profile at `cwd` by scanning marker files and
 * package.json dependencies (MSI-DET-2), or honors an explicit `override`
 * (MSI-DET-3) — an unknown override id is rejected before any file is
 * touched.
 * @param cwd - project root to inspect.
 * @param override - explicit `--profile` id; skips detection when given.
 * @returns the resolved stack profile.
 */
export function resolveProfile(cwd: string, override?: string): StackProfile {
  if (override !== undefined) {
    const profile = STACK_PROFILES.find((candidate) => candidate.name === override);

    if (!profile) {
      const known = STACK_PROFILES.map((candidate) => candidate.name).join(', ');
      throw new Error(`Unknown --profile "${override}". Expected one of: ${known}.`);
    }

    return profile;
  }

  const packageJsonPath = path.join(cwd, 'package.json');
  const manifest = existsSync(packageJsonPath)
    ? (JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      })
    : {};

  const input: DetectionInput = {
    markerFiles: [...new Set(STACK_PROFILES.flatMap((profile) => profile.detect.markerFiles))].filter((file) =>
      existsSync(path.join(cwd, file)),
    ),
    dependencies: [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})],
  };

  const name = matchProfile(input);
  const profile = STACK_PROFILES.find((candidate) => candidate.name === name);

  if (!profile) {
    // Invariant: STACK_PROFILES always registers an entry for every
    // ProfileName matchProfile can return (ts-lib is the guaranteed fallback).
    throw new Error(`No StackProfile registered for resolved profile "${name}".`);
  }

  return profile;
}
