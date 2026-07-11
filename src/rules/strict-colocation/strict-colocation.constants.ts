/**
 * Every check id the rule can enforce; the `checks` option narrows this set
 * for role files that legitimately own a subset of declaration kinds.
 */
export const allChecks = [
  'root-variable',
  'root-helper-function',
  'exported-const',
  'default-arrow-export',
  'inline-interface',
  'inline-type-alias',
  'zod-import',
] as const;

/** Matches `zod` itself and any `zod/*` subpath import. */
export const zodImportPattern = /^zod(?:\/.*)?$/u;
