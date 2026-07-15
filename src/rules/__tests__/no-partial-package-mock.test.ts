import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { noPartialPackageMock } from '../no-partial-package-mock/index.js';

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

ruleTester.run('no-partial-package-mock', noPartialPackageMock, {
  valid: [
    {
      name: 'relative specifier with a param factory stays outside the module loader bug',
      code: `
        vi.mock('./season-client', (actual) => ({ ...actual, load: () => [] }));
      `,
    },
    {
      name: 'full factory with no params is a complete replacement, never touches the real module',
      code: `
        vi.mock('season-client', () => ({ load: () => [] }));
      `,
    },
    {
      name: 'a declared but unused first parameter never invokes the loader path',
      code: `
        vi.mock('season-client', (actual) => ({ load: () => [] }));
      `,
    },
    {
      name: 'the default @/ alias prefix is treated as local, not bare',
      code: `
        vi.mock('@/season-client', (actual) => ({ ...actual, load: () => [] }));
      `,
    },
    {
      name: 'a custom local-alias prefix supplied via options is treated as local',
      options: [{ localAliasPrefixes: ['#lib/'] }],
      code: `
        vi.mock('#lib/season-client', (actual) => ({ ...actual, load: () => [] }));
      `,
    },
    {
      name: 'a non-static specifier cannot be classified and is left alone',
      code: `
        vi.mock(seasonClientSpecifier, (actual) => ({ ...actual, load: () => [] }));
      `,
    },
    {
      name: 'vi.importActual on a relative specifier is not a bare package specifier',
      code: `
        const actual = await vi.importActual('./season-client');
      `,
    },
  ],
  invalid: [
    {
      name: 'a referenced-param factory on a bare package specifier reads through the loader',
      code: `
        vi.mock('season-client', (actual) => ({ ...actual, load: () => [] }));
      `,
      errors: [{ messageId: 'partialPackageMock' }],
    },
    {
      name: 'scoped packages are bare specifiers too',
      code: `
        vi.mock('@season/client', (actual) => ({ ...actual, load: () => [] }));
      `,
      errors: [{ messageId: 'partialPackageMock' }],
    },
    {
      name: 'a zero-expression template-literal specifier bypasses Literal-only checks',
      code: `
        vi.mock(\`season-client\`, (actual) => ({ ...actual, load: () => [] }));
      `,
      errors: [{ messageId: 'partialPackageMock' }],
    },
    {
      name: 'vi.doMock has the identical bug shape as vi.mock',
      code: `
        vi.doMock('season-client', (actual) => ({ ...actual, load: () => [] }));
      `,
      errors: [{ messageId: 'partialPackageMock' }],
    },
    {
      name: 'vi.importActual on a bare specifier reproduces the bug even from a zero-param factory',
      code: `
        vi.mock('season-client', () => ({ load: () => vi.importActual('season-client') }));
      `,
      errors: [{ messageId: 'importActualPackage' }],
    },
  ],
});
