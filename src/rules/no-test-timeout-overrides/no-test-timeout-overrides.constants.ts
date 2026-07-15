/**
 * Vitest's default `testTimeout` (milliseconds), per the Vitest config
 * types/docs. Config files may only LOWER this value — a stricter budget is
 * a better regression detector; raising it papers over a performance bug.
 */
export const defaultVitestTestTimeoutMs = 5000;

/**
 * Vitest's default `hookTimeout` (milliseconds), per the Vitest config
 * types/docs. Deliberately higher than `testTimeout` — hooks legitimately do
 * more setup/teardown work than a single test body.
 */
export const defaultVitestHookTimeoutMs = 10000;

/** Test-declaring call names governed by the position-based trailing-argument check. */
export const testCallRootNames = new Set(['it', 'test']);

/** Hook call names governed by the position-based trailing-argument check. */
export const hookCallRootNames = new Set(['beforeEach', 'afterEach', 'beforeAll', 'afterAll']);
