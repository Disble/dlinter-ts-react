/** The one file `write` additively merges instead of skip-if-exists (MSI-OVR-1's carve-out). */
export const LEFTHOOK_FILE_NAME = 'lefthook.yml';

/** The consumer manifest `write` read-modify-writes to scaffold missing gate scripts (MSI-SCR). */
export const PACKAGE_JSON_FILE_NAME = 'package.json';

/** Fallback indent width used when an existing `package.json`'s own indent can't be sniffed. */
export const DEFAULT_JSON_INDENT = 2;

/** Text encoding for every `readFileSync` in `write` — one source instead of a repeated inline literal. */
export const UTF8: BufferEncoding = 'utf8';

/** The `MergeOutcome` mode/ownership tag values `writeLefthook` branches on, named instead of inline. */
export const OUTCOME = {
  CREATED: 'created',
  MERGED: 'merged',
  STATE_FILE: 'state-file',
} as const;
