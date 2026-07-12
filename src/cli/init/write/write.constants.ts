/** The one file `write` additively merges instead of skip-if-exists (MSI-OVR-1's carve-out). */
export const LEFTHOOK_FILE_NAME = 'lefthook.yml';

/** The consumer manifest `write` read-modify-writes to scaffold missing gate scripts (MSI-SCR). */
export const PACKAGE_JSON_FILE_NAME = 'package.json';

/** Fallback indent width used when an existing `package.json`'s own indent can't be sniffed. */
export const DEFAULT_JSON_INDENT = 2;
