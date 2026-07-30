/** Exact, mutually compatible Stryker packages installed for the generated guard. */
export const MUTATION_DEPENDENCIES = ['@stryker-mutator/core@9.6.1', '@stryker-mutator/vitest-runner@9.6.1'] as const;

/** The package script and Lefthook job installed by the mutation capability. */
export const MUTATION_SCRIPT_NAME = 'test:mutation:staged';

/** A dedicated directory prevents mutation sandboxes leaking into ordinary Vitest runs. */
export const MUTATION_TEMP_DIR = '.dlinter-mutation-tmp';
