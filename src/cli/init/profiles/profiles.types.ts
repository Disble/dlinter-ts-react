/**
 * Stack shapes `dlinter init` can detect and scaffold a gate for. Order in
 * `STACK_PROFILES` (not this union) encodes detection precedence.
 */
export type ProfileName = 'wails-frontend' | 'nextjs' | 'react-native' | 'react-spa' | 'ts-lib';

/**
 * File-signature and dependency corroboration a profile matches on. Marker
 * files are any-of (empty = no file requirement — matches unconditionally,
 * used by the terminal `ts-lib` fallback). `dependencies` defaults to
 * any-of corroboration; set `requireAllDependencies` when a profile needs
 * every listed dependency present (e.g. `react-spa` needs BOTH `react` and
 * `react-dom`, per MSI-DET-2 step 4, unlike `react-native`'s any-of
 * `expo`/`react-native`).
 */
export interface DetectionSignals {
  readonly markerFiles: readonly string[];
  readonly dependencies?: readonly string[];
  readonly requireAllDependencies?: boolean;
}

/**
 * Real-world signals gathered from a project root, shaped for the pure
 * matcher — no filesystem access happens past this boundary.
 */
export interface DetectionInput {
  readonly markerFiles: readonly string[];
  readonly dependencies: readonly string[];
}

/** A gate job expressed as a SCRIPT contract — the script name is the contract. */
export interface GateJobContract {
  /** lefthook job name AND package.json script name (e.g. 'lint', 'typecheck'). */
  readonly script: string;
  /** 'run' invokes `runner.run(script)`; 'exec' invokes `runner.exec(bin, args)`. */
  readonly kind: 'run' | 'exec';
  /** For `kind === 'exec'`: the binary + args. */
  readonly exec?: { readonly bin: string; readonly args: readonly string[] };
  /** package.json script body to scaffold when ABSENT. `null` = never scaffold. */
  readonly scaffoldScript: string | null;
}

/** The Wails-style infrastructure knob — SINGLE source for fallow + eslint. */
export interface InfrastructureKnowledge {
  readonly importPatterns: readonly string[];
  readonly runtimeGlobals: readonly string[];
}

/** `.fallowrc.json` body scaffolded for a profile's resolved surface. */
export interface FallowConfig {
  readonly entryPoints: readonly string[];
  readonly ignorePatterns: readonly string[];
}

/**
 * A pure-data descriptor for one repo shape. Adding a stack is one array
 * row in `STACK_PROFILES` — no new branch anywhere else (ADR-1).
 */
export interface StackProfile {
  readonly name: ProfileName;
  readonly detect: DetectionSignals;
  /** Surface dir relative to root: `''` = flat, `'frontend'` = subdir. */
  readonly surfaceDir: string;
  readonly gateJobs: readonly GateJobContract[];
  readonly fallow: FallowConfig | null;
  /** Populated only by `wails-frontend` in v1. */
  readonly infrastructure?: InfrastructureKnowledge;
}
