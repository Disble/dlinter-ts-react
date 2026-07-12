/** Package the eslint snippet's suggested import statement resolves to. */
export const ESLINT_SNIPPET_PACKAGE = 'dlinter-ts-react';

/**
 * Schema URL written into every scaffolded `.fallowrc.json`'s `$schema`
 * field. `writeOnly` per fallow's own schema — editor-only, stripped before
 * fallow reads the file, so any valid fallow schema URL is safe here.
 */
export const FALLOW_SCHEMA_URL = 'https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json';

/**
 * Lefthook job name per `GateJobContract.script`. Every profile's shared
 * `AUDIT_JOB` (profiles.constants.ts) has `script: 'audit'` but renders as
 * the `fallow` lefthook job (MSI-REN-1); every other script name already
 * doubles as its own job name, so only this one mapping is needed.
 */
export const LEFTHOOK_JOB_NAME_BY_SCRIPT: Readonly<Record<string, string>> = {
  audit: 'fallow',
};
