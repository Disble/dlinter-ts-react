import { Document, parseDocument } from 'yaml';

import { ensureJobsSeq, reconcileJobs, verifyMarkersSurvived } from './merge.helpers.js';
import type { MergeJob, MergeOutcome } from './merge.types.js';

/**
 * Additively merges `jobs` into `existingText`'s `pre-commit.jobs` (or
 * builds a fresh `lefthook.yml` when `existingText` is `null`), preserving
 * every foreign job byte-for-byte. Pure string → string + report: no
 * filesystem access happens here — `write` (PR-4b) is the only disk mutator,
 * including reading back `.dlinter-init.json` and supplying its job names
 * as `priorOwnedJobNames` (MSI-MRG-6's consult path).
 * @param existingText - the consumer's current `lefthook.yml` content, or
 *   `null` when no file exists yet.
 * @param jobs - the rendered dlinter jobs to reconcile (MSI-REN-1's output).
 * @param priorOwnedJobNames - job names the caller already knows are
 *   dlinter-owned from a previously persisted `.dlinter-init.json` state
 *   file (MSI-MRG-6, ADR-4) — consulted when a same-named job in
 *   `existingText` lacks a surviving comment marker, so a marker-loss on one
 *   run does not permanently misclassify dlinter's own jobs as foreign name
 *   collisions on the next. Defaults to none (comment-only ownership).
 * @returns the merged/created YAML text plus ownership and warning metadata.
 */
export function mergeLefthookJobs(
  existingText: string | null,
  jobs: readonly MergeJob[],
  priorOwnedJobNames: readonly string[] = [],
): MergeOutcome {
  const doc = existingText === null ? new Document({}) : parseDocument(existingText);
  const seq = ensureJobsSeq(doc);
  const warnings = reconcileJobs(doc, seq, jobs, priorOwnedJobNames);
  const text = doc.toString();
  const ownedNames = jobs.map((job) => job.name).filter((name) => !warnings.some((warning) => warning.job === name));
  const mode = existingText === null ? 'created' : 'merged';

  if (verifyMarkersSurvived(text, ownedNames)) {
    return { mode, text, ownership: 'comment', warnings };
  }

  return { mode, text, ownership: 'state-file', warnings, stateFile: { version: 1, lefthookJobs: ownedNames } };
}
