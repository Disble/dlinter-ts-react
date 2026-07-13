/** Package the eslint snippet's suggested import statement resolves to. */
export const ESLINT_SNIPPET_PACKAGE = 'dlinter-ts-react';

/**
 * Schema URL written into every scaffolded `.fallowrc.json`'s `$schema`
 * field. `writeOnly` per fallow's own schema — editor-only, stripped before
 * fallow reads the file, so any valid fallow schema URL is safe here.
 */
export const FALLOW_SCHEMA_URL = 'https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json';

/**
 * Architecture-invariant `.fallowrc.json` body shared by every stack profile.
 * The strict rule set, semantic duplicate detection, and `index.ts` barrel
 * handling are the SAME governance dlinter enforces on every stack — the
 * "hard work" the package does for consumers — so they live here once, not in
 * per-profile data. A profile contributes only its *surface* (`entry` +
 * `ignorePatterns`); `renderFallowFile` merges that surface onto this
 * baseline. Mirrors the preset's own shape: one strong opinionated baseline,
 * with stack specifics as narrow additions rather than a thin per-stack file.
 */
export const STRICT_FALLOW_BASELINE = {
  ignoreExports: [{ file: 'src/**/index.ts', exports: ['*'] }],
  overrides: [{ files: ['src/**/index.ts'], rules: { 'unused-types': 'off' } }],
  duplicates: { mode: 'semantic', threshold: 3, minOccurrences: 3 },
  rules: {
    'boundary-violation': 'error',
    'circular-dependencies': 'error',
    'duplicate-exports': 'error',
    'unlisted-dependencies': 'error',
    'unresolved-imports': 'error',
    'unused-dependencies': 'error',
    'unused-files': 'error',
    'unused-exports': 'error',
    'unused-types': 'error',
  },
} as const;

/**
 * Lefthook job name per `GateJobContract.script`. Every profile's shared
 * `AUDIT_JOB` (profiles.constants.ts) has `script: 'audit'` but renders as
 * the `fallow` lefthook job (MSI-REN-1); every other script name already
 * doubles as its own job name, so only this one mapping is needed.
 */
export const LEFTHOOK_JOB_NAME_BY_SCRIPT: Readonly<Record<string, string>> = {
  audit: 'fallow',
};
