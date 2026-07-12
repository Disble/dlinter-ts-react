import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { mergeLefthookJobs, STATE_FILE_NAME } from '../merge/index.js';
import type { RenderedFile, RenderedJob } from '../render/render.types.js';
import { DEFAULT_JSON_INDENT, LEFTHOOK_FILE_NAME, PACKAGE_JSON_FILE_NAME } from './write.constants.js';
import type { FallowWriteReport, LefthookWriteReport, ScriptsWriteReport } from './write.types.js';

/**
 * Reconciles rendered fallow files onto disk (MSI-REN-3, MSI-OVR-1): every
 * file is create-only — an already-present `.fallowrc.json` is left
 * completely untouched and reported as skipped, never merged or reformatted.
 * @param cwd - the consumer project root.
 * @param files - the rendered fallow files (`render`'s `fallowFiles`).
 * @returns which paths were created versus left alone.
 */
export function writeFallowFiles(cwd: string, files: readonly RenderedFile[]): FallowWriteReport {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const targetPath = path.join(cwd, file.path);

    if (existsSync(targetPath)) {
      skipped.push(file.path);
      continue;
    }

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, file.content);
    created.push(file.path);
  }

  return { created, skipped };
}

/**
 * Reconciles `lefthook.yml` via the additive-merge algorithm (MSI-MRG-1..6):
 * reads the existing file (or `null`), delegates the merge to
 * `mergeLefthookJobs`, writes the result, and persists `.dlinter-init.json`
 * whenever ownership fell back to the state file (MSI-MRG-6).
 * @param cwd - the consumer project root.
 * @param jobs - the rendered lefthook jobs (`render`'s `lefthookJobs`).
 * @returns which paths were created/merged, plus any name-collision warnings.
 */
export function writeLefthook(cwd: string, jobs: readonly RenderedJob[]): LefthookWriteReport {
  const lefthookPath = path.join(cwd, LEFTHOOK_FILE_NAME);
  const existingText = existsSync(lefthookPath) ? readFileSync(lefthookPath, 'utf8') : null;
  const outcome = mergeLefthookJobs(existingText, jobs);

  writeFileSync(lefthookPath, outcome.text);

  const created = outcome.mode === 'created' ? [LEFTHOOK_FILE_NAME] : [];
  const merged = outcome.mode === 'merged' ? [LEFTHOOK_FILE_NAME] : [];

  if (outcome.ownership === 'state-file' && outcome.stateFile) {
    writeFileSync(path.join(cwd, STATE_FILE_NAME), `${JSON.stringify(outcome.stateFile, null, 2)}\n`);
    (outcome.mode === 'created' ? created : merged).push(STATE_FILE_NAME);
  }

  const warnings = outcome.warnings.map(
    (warning) => `${LEFTHOOK_FILE_NAME}: job "${warning.job}" already exists without the dlinter ownership marker — left untouched`,
  );

  return { created, merged, warnings };
}

/** Sniffs the indent width of an existing `package.json` to minimize the rewrite diff (design section 5). */
function sniffIndent(raw: string): number {
  const match = /\n( +)"/.exec(raw);

  return match?.[1] ? match[1].length : DEFAULT_JSON_INDENT;
}

/**
 * Scaffolds missing `package.json` scripts (MSI-SCR-1..3): a script name
 * absent from the manifest is added with its profile default; a script
 * name already present is NEVER modified, regardless of its body, and is
 * always reported (MSI-SCR-3) — additionally as a warning when its existing
 * body differs from dlinter's default (a same-name conflict, not silently
 * ignored). When nothing needs to change, `package.json` is left
 * byte-untouched.
 * @param cwd - the consumer project root.
 * @param scripts - the rendered scaffold-if-absent scripts (`render`'s `scripts`).
 * @returns which script names were created versus left alone, plus conflicts.
 */
export function writeScripts(cwd: string, scripts: Readonly<Record<string, string>>): ScriptsWriteReport {
  const created: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];
  const manifestPath = path.join(cwd, PACKAGE_JSON_FILE_NAME);
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as { scripts?: Record<string, string> };
  const existingScripts = manifest.scripts ?? {};
  let changed = false;

  for (const [name, command] of Object.entries(scripts)) {
    const reportName = `${PACKAGE_JSON_FILE_NAME}:scripts.${name}`;

    if (Object.hasOwn(existingScripts, name)) {
      skipped.push(reportName);

      if (existingScripts[name] !== command) {
        warnings.push(`${reportName}: already exists with a different command — left untouched`);
      }

      continue;
    }

    existingScripts[name] = command;
    created.push(reportName);
    changed = true;
  }

  if (changed) {
    manifest.scripts = existingScripts;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, sniffIndent(raw))}\n`);
  }

  return { created, skipped, warnings };
}
