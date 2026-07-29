import { execFileSync } from 'node:child_process';

import type { RunnerName } from '../runners/runners.types.js';
import { MUTATION_DEPENDENCIES } from './mutation.constants.js';

/** Installs the exact Stryker pair only after all generated artifacts are safely reconciled. */
export function installMutationDependencies(cwd: string, runner: RunnerName): void {
  const argsByRunner: Record<RunnerName, readonly string[]> = {
    bun: ['add', '--exact', '--dev', ...MUTATION_DEPENDENCIES],
    npm: ['install', '--save-dev', '--save-exact', ...MUTATION_DEPENDENCIES],
    pnpm: ['add', '--save-dev', '--save-exact', ...MUTATION_DEPENDENCIES],
    yarn: ['add', '--dev', '--exact', ...MUTATION_DEPENDENCIES],
  };

  execFileSync(runner, argsByRunner[runner], { cwd, stdio: 'inherit' });
}
