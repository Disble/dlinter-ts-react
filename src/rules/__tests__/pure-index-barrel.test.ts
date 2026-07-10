import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { pureIndexBarrel } from '../pure-index-barrel.js';

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

ruleTester.run('pure-index-barrel', pureIndexBarrel, {
  valid: [
    {
      name: 'named, type, and star re-exports form a pure barrel',
      code: `
        export { Clock } from './Clock';
        export type { ClockProps } from './clock.types';
        export * from './clock.constants';
      `,
    },
    {
      name: 'an empty barrel is pure',
      code: '',
    },
  ],
  invalid: [
    {
      name: 'local declarations are reported',
      code: `
        export { Clock } from './Clock';
        export const registry = new Map();
      `,
      errors: [{ messageId: 'impureBarrel' }],
    },
    {
      name: 'import plus indirect export are both reported',
      code: `
        import { clock } from './clock';
        export { clock };
      `,
      errors: [{ messageId: 'impureBarrel' }, { messageId: 'impureBarrel' }],
    },
    {
      name: 'side-effect statements are reported',
      code: `
        console.log('barrel loaded');
        export { Clock } from './Clock';
      `,
      errors: [{ messageId: 'impureBarrel' }],
    },
  ],
});
