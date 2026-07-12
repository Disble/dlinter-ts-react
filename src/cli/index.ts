#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import type { InitResult } from './init/index.js';
import { runInit } from './init/index.js';

/**
 * Parses an explicit `--profile <id>` override from the CLI args after
 * `init` (MSI-DET-3). Rejects `--profile` with no following value before
 * `runInit` ever runs.
 * @param argv - CLI arguments following the `init` command.
 * @returns the requested profile id, or `undefined` when `--profile` is absent.
 */
export function parseProfileFlag(argv: readonly string[]): string | undefined {
  const flagIndex = argv.indexOf('--profile');

  if (flagIndex === -1) {
    return undefined;
  }

  const value = argv[flagIndex + 1];

  if (!value) {
    throw new Error('--profile requires a value, e.g. --profile ts-lib');
  }

  return value;
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
 * CLI entrypoint: `dlinter init [--profile <id>]` scaffolds the pre-commit
 * gate in the current project.
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'init') {
    process.stderr.write('Usage: dlinter init [--profile <id>]\n');
    process.exitCode = 1;
    return;
  }

  const profile = parseProfileFlag(process.argv.slice(3));
  const result = await runInit({ cwd: process.cwd(), ...(profile === undefined ? {} : { profile }) });

  for (const line of formatInitResult(result)) {
    process.stdout.write(`${line}\n`);
  }
}

// Only auto-run when this file is the process's actual entrypoint (the
// `dlinter` bin) — importing it for its exports (e.g. from tests) must never
// trigger CLI side effects like `process.exitCode` or stdout/stderr writes.
const isMainModule = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`dlinter failed: ${message}\n`);
    process.exitCode = 1;
  }
}
