import type { RenderedArtifacts } from '../render/render.types.js';
import { writeFallowFiles, writeLefthook, writeScripts } from './write.helpers.js';
import type { WriteResult } from './write.types.js';

/**
 * Reconciles one `render(plan)` output onto disk (MSI-RES-1..3): this is
 * the ONLY module in `dlinter init` allowed to mutate the consumer's
 * project. `lefthook.yml` additively merges (MSI-MRG); every other
 * scaffolded file is create-only (MSI-OVR); missing `package.json` scripts
 * are created, existing ones are never touched (MSI-SCR).
 * @param cwd - the consumer project root.
 * @param artifacts - the pure output of `render(plan)`.
 * @returns the categorized outcome for every file/script `write` touched.
 */
export function writeArtifacts(cwd: string, artifacts: RenderedArtifacts): WriteResult {
  const fallow = writeFallowFiles(cwd, artifacts.fallowFiles);
  const lefthook = writeLefthook(cwd, artifacts.lefthookJobs);
  const scripts = writeScripts(cwd, artifacts.scripts);

  return {
    created: [...fallow.created, ...lefthook.created, ...scripts.created],
    skipped: [...fallow.skipped, ...scripts.skipped],
    merged: lefthook.merged,
    warnings: [...lefthook.warnings, ...scripts.warnings],
  };
}
