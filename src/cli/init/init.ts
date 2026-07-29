import path from 'node:path';

import { detect } from './detect/index.js';
import type { InitOptions, InitResult } from './init.types.js';
import { installMutationDependencies, validateMutationCapability } from './mutation/index.js';
import { render } from './render/index.js';
import { writeArtifacts } from './write/index.js';

/**
 * Scaffolds the dlinter pre-commit gate into a consumer project by composing
 * the three pipeline stages: `detect` resolves the runner/stack profile/
 * surface (an unknown `--profile` override is rejected here, before any file
 * is written — MSI-DET-3); `render` is a pure `ProjectPlan` → artifacts step;
 * `writeArtifacts` is the only stage that mutates the project (additive
 * `lefthook.yml` merge, create-only fallow file, create-absent scripts).
 * @param options - target project location and optional `--profile` override.
 * @returns the categorized file/script outcomes, the advisory ESLint
 * snippet, and the resolved plan (MSI-RES-1..4).
 */
export async function runInit({ cwd, profile, testMutator = false }: InitOptions): Promise<InitResult> {
  const plan = detect(cwd, profile, testMutator);
  const surface = plan.surfaces[0];

  if (!surface) {
    // Invariant: detect() always returns exactly one surface (MSI-DET-6).
    throw new Error('Cannot init from a ProjectPlan with no surfaces.');
  }

  validateMutationCapability(plan);
  const artifacts = render(plan);
  const writeResult = writeArtifacts(cwd, artifacts, surface.dir);

  if (testMutator) {
    installMutationDependencies(path.join(cwd, surface.dir), plan.runner.name);
  }

  return {
    ...writeResult,
    eslintSnippet: artifacts.eslintSnippet,
    resolvedPlan: {
      runner: plan.runner.name,
      profile: surface.profile.name,
      surfaceDir: surface.dir,
    },
  };
}
