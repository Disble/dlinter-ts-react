import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { noTestTimeoutOverrides } from '../no-test-timeout-overrides/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('no-test-timeout-overrides', noTestTimeoutOverrides, {
  valid: [
    {
      name: 'a plain test with no trailing argument',
      code: `test('adds numbers', () => { expect(1 + 1).toBe(2); });`,
    },
    {
      name: 'an options object without a timeout key stays quiet',
      code: `test('adds numbers', { retry: 2 }, () => { expect(1 + 1).toBe(2); });`,
    },
    {
      name: 'vi.setConfig without timeout keys stays quiet',
      code: `vi.setConfig({ restoreMocks: true });`,
    },
    {
      name: 'vi.setConfig with a dynamic argument is a documented accepted gap',
      code: `vi.setConfig(sharedConfig);`,
    },
    {
      name: 'lowering testTimeout below the Vitest default is a stricter regression detector',
      code: `
        export default defineConfig({
          test: {
            testTimeout: 1000,
          },
        });
      `,
    },
    {
      name: 'hookTimeout at 8000 is below the 10000ms Vitest default (asymmetric thresholds)',
      code: `
        export default defineConfig({
          test: {
            hookTimeout: 8000,
          },
        });
      `,
    },
    {
      name: 'a testTimeout key outside a test: object is not the Vitest config contract',
      code: `
        export default defineConfig({
          testTimeout: 20000,
        });
      `,
    },
    {
      name: 'a tagged-template test.each without any timeout stays quiet',
      code: `
        test.each\`
          input | expected
          \${1}  | \${2}
        \`('adds $input', ({ input, expected }) => { expect(input + 1).toBe(expected); });
      `,
    },
  ],
  invalid: [
    {
      name: 'a positional timeout argument after the test callback',
      code: `test('adds numbers', () => { expect(1 + 1).toBe(2); }, 20000);`,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'a positional timeout after the callback on it.only',
      code: `it.only('adds numbers', () => { expect(1 + 1).toBe(2); }, 20000);`,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'a positional timeout after the callback on it.skip',
      code: `it.skip('adds numbers', () => { expect(1 + 1).toBe(2); }, 20000);`,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'the curried .each form unwraps the extra call layer to find the trailing timeout',
      code: `test.each(cases)('adds %s', (input) => { expect(input).toBeDefined(); }, 20000);`,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'an options-object timeout before the callback on test',
      code: `test('adds numbers', { timeout: 20000 }, () => { expect(1 + 1).toBe(2); });`,
      errors: [{ messageId: 'optionsTimeout' }],
    },
    {
      name: 'an options-object timeout before the callback on describe',
      code: `describe('math', { timeout: 20000 }, () => { it('adds', () => {}); });`,
      errors: [{ messageId: 'optionsTimeout' }],
    },
    {
      name: 'a timeout argument after the beforeEach hook callback',
      code: `beforeEach(() => { setup(); }, 20000);`,
      errors: [{ messageId: 'hookTimeout' }],
    },
    {
      name: 'vi.setConfig raising testTimeout at runtime',
      code: `vi.setConfig({ testTimeout: 1 });`,
      errors: [{ messageId: 'setConfigTimeout' }],
    },
    {
      name: 'an identifier-valued positional timeout is caught by position, not value',
      code: `it('adds numbers', () => { expect(1 + 1).toBe(2); }, SLOW_TIMEOUT);`,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'raising testTimeout above the 5000ms Vitest default inside a config test: block',
      code: `
        export default defineConfig({
          test: {
            testTimeout: 20000,
          },
        });
      `,
      errors: [{ messageId: 'configTimeoutRaise' }],
    },
    {
      name: 'raising hookTimeout above the 10000ms Vitest default inside a config test: block',
      code: `
        export default defineConfig({
          test: {
            hookTimeout: 20000,
          },
        });
      `,
      errors: [{ messageId: 'configTimeoutRaise' }],
    },
    {
      name: 'a tagged-template test.each with a positional timeout after the callback',
      code: `
        test.each\`
          input | expected
          \${1}  | \${2}
        \`('adds $input', ({ input, expected }) => { expect(input + 1).toBe(expected); }, 20000);
      `,
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      name: 'a tagged-template test.each with an options-object timeout before the callback',
      code: `
        test.each\`
          input | expected
          \${1}  | \${2}
        \`('adds $input', { timeout: 20000 }, ({ input, expected }) => { expect(input + 1).toBe(expected); });
      `,
      errors: [{ messageId: 'optionsTimeout' }],
    },
  ],
});
