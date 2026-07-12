import { isMap, parseDocument } from 'yaml';
import type { Document, YAMLMap, YAMLSeq } from 'yaml';

import { JOBS_PATH, OWNERSHIP_COMMENT, OWNERSHIP_MARKER } from './merge.constants.js';
import type { MergeJob, MergeWarning } from './merge.types.js';

/** True when `node` itself carries a `commentBefore` containing the marker. */
function hasMarkerComment(node: { readonly commentBefore?: string | null } | undefined): boolean {
  return typeof node?.commentBefore === 'string' && node.commentBefore.includes(OWNERSHIP_MARKER);
}

/** Index of the job named `name` in `seq`, or `-1` if absent. */
function findJobIndex(seq: YAMLSeq, name: string): number {
  return seq.items.findIndex((item) => isMap(item) && item.get('name') === name);
}

/**
 * True when the job at `seq.items[index]` carries the dlinter ownership
 * marker (MSI-MRG-3). A comment immediately after the `jobs:` key and
 * before the sequence's very FIRST item has no preceding sibling to anchor
 * to, so the yaml library's parser attaches it to the sequence node itself
 * rather than to that item — a real, reproducible round-trip quirk of
 * block sequences (verified empirically), not a hypothetical edge case.
 * Index 0 therefore also checks the sequence's own leading comment.
 */
function isOwnedAt(seq: YAMLSeq, index: number): boolean {
  const item = seq.items[index];

  return isMap(item) && (hasMarkerComment(item) || (index === 0 && hasMarkerComment(seq)));
}

/**
 * Returns `doc`'s `pre-commit.jobs` sequence, creating `pre-commit` (with
 * `parallel: false`) and/or an empty `jobs` sequence first when either is
 * absent — via `createNode` so the created value is a real Document node
 * (a plain-object `setIn` on a not-yet-existing path does not recurse into
 * real nodes and breaks later node-level mutation).
 */
export function ensureJobsSeq(doc: Document): YAMLSeq {
  if (!doc.has('pre-commit')) {
    doc.set('pre-commit', doc.createNode({ parallel: false, jobs: [] }));
  }

  const preCommit = doc.get('pre-commit', true) as YAMLMap;

  if (!preCommit.has('jobs')) {
    preCommit.set('jobs', doc.createNode([]));
  }

  return preCommit.get('jobs', true) as unknown as YAMLSeq;
}

/** Builds a fresh, marker-tagged lefthook job node for `job` (MSI-MRG-3). */
function buildOwnedJobNode(doc: Document, job: MergeJob): YAMLMap {
  const node = doc.createNode({
    name: job.name,
    run: job.run,
    ...(job.root === undefined ? {} : { root: job.root }),
  }) as YAMLMap;

  node.commentBefore = OWNERSHIP_COMMENT;

  return node;
}

/**
 * Reconciles `jobs` into `seq` in place (MSI-MRG-1/2/3/4/6): a dlinter-owned
 * job already present is refreshed (`run`/`root`) without moving it; a
 * missing job is appended, marked; a same-named job WITHOUT the marker is
 * treated as owned anyway when its name appears in `priorOwnedJobNames` —
 * the MSI-MRG-6 consult path, populated by the caller (`write`) from the
 * `.dlinter-init.json` state file when comment markers previously failed a
 * survival check for this file. Only a same-named job that is neither
 * marker-owned nor prior-owned is a genuine foreign job — it is never read
 * or written, and its name is reported as a conflict. Every other item in
 * `seq` is never touched.
 * @param doc - the document being merged into (needed to create new nodes).
 * @param seq - the resolved `pre-commit.jobs` sequence.
 * @param jobs - the rendered dlinter jobs to reconcile.
 * @param priorOwnedJobNames - job names already known to be dlinter-owned
 *   from a previous run's state-file fallback (MSI-MRG-6); defaults to none.
 * @returns the name-collision warnings encountered (MSI-MRG-4).
 */
export function reconcileJobs(
  doc: Document,
  seq: YAMLSeq,
  jobs: readonly MergeJob[],
  priorOwnedJobNames: readonly string[] = [],
): readonly MergeWarning[] {
  const warnings: MergeWarning[] = [];

  for (const job of jobs) {
    const index = findJobIndex(seq, job.name);

    if (index === -1) {
      seq.items.push(buildOwnedJobNode(doc, job));
      continue;
    }

    if (!isOwnedAt(seq, index) && !priorOwnedJobNames.includes(job.name)) {
      warnings.push({ kind: 'name-collision', job: job.name });
      continue;
    }

    const existing = seq.items[index] as YAMLMap;

    existing.set('run', job.run);
    job.root === undefined ? existing.delete('root') : existing.set('root', job.root);
  }

  return warnings;
}

/**
 * Post-write safety check for MSI-MRG-6: re-parses `text` and confirms
 * every name in `ownedNames` still resolves as owned (via `isOwnedAt`,
 * including the first-item seq-comment case above). This is what routes
 * ownership to the state-file fallback (ADR-4) instead of silently losing
 * track of a dlinter-owned job, should some other `lefthook.yml` shape
 * defeat the yaml library's comment round-trip in a way not yet accounted
 * for here.
 */
export function verifyMarkersSurvived(text: string, ownedNames: readonly string[]): boolean {
  const seq = parseDocument(text).getIn(JOBS_PATH) as YAMLSeq | undefined;

  if (!seq) {
    return ownedNames.length === 0;
  }

  return ownedNames.every((name) => {
    const index = findJobIndex(seq, name);

    return index !== -1 && isOwnedAt(seq, index);
  });
}
