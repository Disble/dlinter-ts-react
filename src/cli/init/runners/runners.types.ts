/**
 * Package manager identifiers `dlinter init` can detect and scaffold gate
 * commands for.
 */
export type RunnerName = 'bun' | 'npm' | 'pnpm' | 'yarn';

/**
 * Pure invocation-string renderer for one package manager. Adapters never
 * take a working directory — surface placement (e.g. Wails' `frontend/`
 * subdir) is the renderer's job via lefthook's per-job `root:` key, keeping
 * "how to invoke" orthogonal to "where" (ADR-3).
 */
export interface RunnerAdapter {
  /** Canonical identifier; also the detection precedence key. */
  readonly name: RunnerName;
  /** Lockfiles whose presence at repo root identifies this runner. */
  readonly lockfiles: readonly string[];
  /** Renders a package.json script invocation, e.g. `bun run lint`. */
  run(script: string): string;
  /** Renders a one-off binary invocation, e.g. `bun x fallow audit --quiet`. */
  exec(bin: string, args?: readonly string[]): string;
}
