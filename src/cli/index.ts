#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { InitResult } from './init/index.js';
import { runInit } from './init/index.js';

/**
 * True when this module is the process's real entrypoint (the `dlinter` bin),
 * robust to symlinked invocation. npm links `node_modules/.bin/dlinter` to the
 * real dist file, so `process.argv[1]` is the symlink while `import.meta.url`
 * is the resolved target — a raw path `===` is false on Linux/macOS and
 * silently disables the CLI (Windows uses a `.cmd` shim, hiding the bug). Both
 * sides are resolved through `realpathSync` before comparison; a plain compare
 * is the fallback when a path cannot be resolved.
 * @param moduleUrl - the module's `import.meta.url`.
 * @param invokedPath - `process.argv[1]`, or `undefined` when merely imported.
 * @returns whether the CLI should auto-run.
 */
export function isProcessEntrypoint(moduleUrl: string, invokedPath: string | undefined): boolean {
  if (invokedPath === undefined) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);

  try {
    return realpathSync(invokedPath) === realpathSync(modulePath);
  } catch {
    return modulePath === invokedPath;
  }
}

/**
 * Parses supported `init` capability flags before `runInit` runs.
 * @param argv - CLI arguments following the `init` command.
 * @returns the options requested by the caller.
 */
export function parseInitFlags(argv: readonly string[]): { readonly profile?: string; readonly testMutator?: true } {
  const flagIndex = argv.indexOf('--profile');
  const value = flagIndex === -1 ? undefined : argv[flagIndex + 1];

  if (flagIndex !== -1 && !value) {
    throw new Error('--profile requires a value, e.g. --profile ts-lib');
  }

  return {
    ...(value === undefined ? {} : { profile: value }),
    ...(argv.includes('--test-mutator') ? { testMutator: true } : {}),
  };
}

/**
 * Formats a `runInit` outcome into the lines printed to stdout: the resolved
 * plan first (MSI-RES-4), then every file/script outcome (MSI-RES-1,
 * MSI-RES-2), then the suggested ESLint snippet when present (MSI-RES-3).
 * @param result - the outcome returned by `runInit`.
 * @returns the lines to print, in order.
 */
export function formatInitResult(result: InitResult): readonly string[] {
  const { resolvedPlan } = result;
  const lines: string[] = [
    `detected: runner=${resolvedPlan.runner} profile=${resolvedPlan.profile} surface=${resolvedPlan.surfaceDir === '' ? '.' : resolvedPlan.surfaceDir}`,
  ];

  for (const file of result.created) {
    lines.push(`created ${file}`);
  }

  for (const file of result.merged) {
    lines.push(`merged ${file} (added missing dlinter-owned jobs)`);
  }

  for (const file of result.skipped) {
    lines.push(`skipped ${file} (already exists)`);
  }

  for (const warning of result.warnings) {
    lines.push(`warning: ${warning}`);
  }

  if (result.eslintSnippet) {
    lines.push('suggested eslint.config.js addition:', result.eslintSnippet);
  }

  return lines;
}

/**
 * CLI entrypoint: `dlinter init [--profile <id>] [--test-mutator]` scaffolds the pre-commit
 * gate in the current project.
 */
export async function main(argv = process.argv, cwd = process.cwd()): Promise<void> {
  const command = argv[2];

  if (command !== 'init') {
    process.stderr.write('Usage: dlinter init [--profile <id>] [--test-mutator]\n');
    process.exitCode = 1;
    return;
  }

  const result = await runInit({ cwd, ...parseInitFlags(argv.slice(3)) });

  for (const line of formatInitResult(result)) {
    process.stdout.write(`${line}\n`);
  }
}

// Only auto-run when this file is the process's actual entrypoint (the
// `dlinter` bin) — importing it for its exports (e.g. from tests) must never
// trigger CLI side effects like `process.exitCode` or stdout/stderr writes.
if (isProcessEntrypoint(import.meta.url, process.argv[1])) {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`dlinter failed: ${message}\n`);
    process.exitCode = 1;
  }
}
