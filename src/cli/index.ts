#!/usr/bin/env node
import { runInit } from './init.js';

/**
 * CLI entrypoint: `dlinter init` scaffolds the pre-commit gate in the current project.
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== 'init') {
    process.stderr.write('Usage: dlinter init\n');
    process.exitCode = 1;
    return;
  }

  const result = await runInit({ cwd: process.cwd() });

  for (const file of result.created) {
    process.stdout.write(`created ${file}\n`);
  }

  for (const file of result.skipped) {
    process.stdout.write(`skipped ${file} (already exists)\n`);
  }
}

main().catch((error: Error) => {
  process.stderr.write(`dlinter failed: ${error.message}\n`);
  process.exitCode = 1;
});
