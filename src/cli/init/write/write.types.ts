/**
 * Outcome of reconciling one `render(plan)` output onto disk (MSI-RES-1..3).
 * Intentionally NOT yet `init.types.ts`'s `InitResult` — `writeArtifacts`
 * only sees `RenderedArtifacts`, never the resolved `ProjectPlan`, so it
 * cannot populate MSI-RES-4's `resolvedPlan` field. Threading the plan
 * through, or renaming this type into `InitResult`, is PR-5's job when it
 * wires `detect → render → write` into `runInit`.
 */
export interface WriteResult {
  /** New files/scripts written for the first time. */
  readonly created: readonly string[];
  /** Already-existing files/scripts left completely untouched. */
  readonly skipped: readonly string[];
  /** Existing `lefthook.yml` that gained dlinter-owned jobs without a full rewrite. */
  readonly merged: readonly string[];
  /** Human-readable conflicts: reserved lefthook job names or package.json scripts already owned by the consumer. */
  readonly warnings: readonly string[];
}

/** `writeFallowFiles`' per-call report — which fallow files were created versus left alone (MSI-OVR-1). */
export interface FallowWriteReport {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
}

/** `writeLefthook`'s per-call report — file-level outcome plus any name-collision warnings (MSI-MRG). */
export interface LefthookWriteReport {
  readonly created: readonly string[];
  readonly merged: readonly string[];
  readonly warnings: readonly string[];
}

/** `writeScripts`' per-call report — which script names were created, left alone, or conflicted (MSI-SCR). */
export interface ScriptsWriteReport {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly warnings: readonly string[];
}
