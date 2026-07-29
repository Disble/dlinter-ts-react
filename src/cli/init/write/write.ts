import path from 'node:path';

import type { RenderedArtifacts } from '../render/render.types.js';
import { preflightCapabilities, writeFallowFiles, writeFiles, writeGitignore, writeLefthook, writeScripts } from './write.helpers.js';
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
export function writeArtifacts(cwd: string, artifacts: RenderedArtifacts, surfaceDir = ''): WriteResult {
  preflightCapabilities(cwd, surfaceDir, artifacts.files, artifacts.requiredScripts, artifacts.requiredLefthookJobs);
  const fallow = writeFallowFiles(cwd, artifacts.fallowFiles);
  const files = writeFiles(cwd, artifacts.files);
  const gitignore = writeGitignore(cwd, surfaceDir, artifacts.gitignoreEntries);
  const lefthook = writeLefthook(cwd, artifacts.lefthookJobs);
  const scripts = writeScripts(path.join(cwd, surfaceDir), artifacts.scripts);

  return {
    created: [...fallow.created, ...files.created, ...gitignore.created, ...lefthook.created, ...scripts.created],
    skipped: [...fallow.skipped, ...files.skipped, ...gitignore.skipped, ...scripts.skipped],
    merged: [...gitignore.merged, ...lefthook.merged],
    warnings: [...lefthook.warnings, ...scripts.warnings],
  };
}
