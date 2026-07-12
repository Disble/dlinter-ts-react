/**
 * One dlinter-rendered lefthook job to reconcile into an existing (or new)
 * `pre-commit.jobs` sequence. Surface placement (ADR-3) is carried via
 * `root`, matching lefthook's own per-job key — never baked into `run`.
 */
export interface MergeJob {
  readonly name: string;
  readonly run: string;
  readonly root?: string;
}

/**
 * How ownership of dlinter-managed jobs is currently tracked for a given
 * `lefthook.yml` (ADR-4): `'comment'` is the default, primary mechanism;
 * `'state-file'` is the defensive fallback used only when a post-write
 * marker-survival check (MSI-MRG-6) proves comments unsafe for this file.
 */
export type OwnershipMode = 'comment' | 'state-file';

/**
 * A dlinter-reserved job name (`fallow`, `lint`, `typecheck`, `test`) that
 * already exists in the file WITHOUT the ownership marker (MSI-MRG-4) — a
 * name collision with a foreign, hand-written job. Merge never overwrites
 * it; the caller must resolve the collision manually.
 */
export interface MergeWarning {
  readonly kind: 'name-collision';
  readonly job: string;
}

/**
 * The `.dlinter-init.json` body `write` (PR-4b) persists to disk when
 * ownership falls back to a state file (MSI-MRG-6).
 */
export interface MergeStateFile {
  readonly version: 1;
  readonly lefthookJobs: readonly string[];
}

/**
 * Pure result of merging rendered jobs into an existing (or absent)
 * `lefthook.yml`: everything `write` (PR-4b) needs to reconcile onto disk.
 */
export interface MergeOutcome {
  readonly mode: 'created' | 'merged';
  readonly text: string;
  readonly ownership: OwnershipMode;
  readonly warnings: readonly MergeWarning[];
  /** Present only when `ownership === 'state-file'` (MSI-MRG-6). */
  readonly stateFile?: MergeStateFile;
}
