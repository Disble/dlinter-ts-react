import type { ProjectPlan } from '../detect/detect.types.js';
import { renderEslintSnippet, renderFallowFile, renderLefthookJobs, renderScripts } from './render.helpers.js';
import type { RenderedArtifacts } from './render.types.js';

/**
 * Pure `ProjectPlan` → `RenderedArtifacts` orchestrator (MSI-REN-1..6).
 * Never touches disk — calling it any number of times with the same plan
 * returns deep-equal artifacts; `write` (PR-4b) is the only module allowed
 * to mutate the consumer's project.
 * @param plan - the resolved project plan produced by `detect`.
 * @returns the rendered lefthook jobs, fallow file, scripts, and eslint snippet.
 */
export function render(plan: ProjectPlan): RenderedArtifacts {
  const surface = plan.surfaces[0];

  if (!surface) {
    // Invariant: detect() always returns exactly one surface (MSI-DET-6).
    throw new Error('Cannot render a ProjectPlan with no surfaces.');
  }

  const fallowFile = renderFallowFile(surface.dir, surface.profile.fallow);

  return {
    lefthookJobs: renderLefthookJobs(plan.runner, surface.profile, surface.dir),
    fallowFiles: fallowFile ? [fallowFile] : [],
    scripts: renderScripts(surface.profile),
    eslintSnippet: renderEslintSnippet(surface.profile),
  };
}
