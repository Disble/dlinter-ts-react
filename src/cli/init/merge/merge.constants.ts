/** Comment marker identifying a lefthook job as dlinter-managed (MSI-MRG-3, ADR-4). */
export const OWNERSHIP_MARKER = 'dlinter:owned';

/** Full marker comment text written immediately before each dlinter-owned job. */
export const OWNERSHIP_COMMENT = ` ${OWNERSHIP_MARKER} — managed by \`dlinter init\`; safe to re-run, do not rename`;

/**
 * Fallback state file `write` (PR-4b) persists when ownership tracking
 * falls back from comments (MSI-MRG-6, ADR-4).
 */
export const STATE_FILE_NAME = '.dlinter-init.json';

/** Path to the lefthook jobs sequence inside the parsed/created Document. */
export const JOBS_PATH = ['pre-commit', 'jobs'] as const;
