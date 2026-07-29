/**
 * One rendered lefthook `pre-commit.jobs` entry. Adapting to a non-root
 * surface (e.g. `wails-frontend` resolving to `frontend/`) is expressed via
 * lefthook's own per-job `root:` key (ADR-3) — the invocation string itself
 * never bakes in a `cd`.
 */
export interface RenderedJob {
  readonly name: string;
  readonly run: string;
  /** lefthook per-job cwd; `undefined` = run from the project root. */
  readonly root?: string;
}

/** A file `write` (PR-4b) may scaffold, relative to the project root. */
export interface RenderedFile {
  readonly path: string;
  readonly content: string;
}

/**
 * The pure output of `render(plan)` (MSI-REN-1..6): everything `write`
 * needs to reconcile onto disk, plus the advisory ESLint snippet — nothing
 * here has touched the filesystem.
 */
export interface RenderedArtifacts {
  readonly lefthookJobs: readonly RenderedJob[];
  readonly fallowFiles: readonly RenderedFile[];
  /** Create-only capability files, such as the mutation guard and its configs. */
  readonly files: readonly RenderedFile[];
  /** Entries additively managed in the consumer surface's .gitignore. */
  readonly gitignoreEntries: readonly string[];
  /** Capability scripts that must match exactly before any capability artifacts are written. */
  readonly requiredScripts: Readonly<Record<string, string>>;
  /** Capability jobs that must be dlinter-owned before any capability artifacts are written. */
  readonly requiredLefthookJobs: readonly RenderedJob[];
  /** package.json scripts to scaffold when absent (MSI-SCR-1). */
  readonly scripts: Readonly<Record<string, string>>;
  /** Suggested `eslint.config.js` snippet — surfaced, never written (MSI-REN-5). */
  readonly eslintSnippet: string;
}
