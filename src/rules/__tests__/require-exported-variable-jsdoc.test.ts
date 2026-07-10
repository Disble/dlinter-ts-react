import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { requireExportedVariableJsdoc } from '../require-exported-variable-jsdoc.js';

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

ruleTester.run('require-exported-variable-jsdoc', requireExportedVariableJsdoc, {
  valid: [
    {
      name: 'exported variable with an immediately preceding JSDoc block stays green',
      code: `
        /**
         * Maximum retry attempts for the season fetch.
         */
        export const MAX_RETRIES = 3;
      `,
    },
    {
      name: 'exported functions are outside this rule (jsdoc/require-jsdoc owns them)',
      code: `
        export function formatLabel(label: string) {
          return label.trim();
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'exported variable without JSDoc is reported',
      code: `
        export const MAX_RETRIES = 3;
      `,
      errors: [{ messageId: 'missingJsdoc' }],
    },
    {
      name: 'a line comment does not satisfy the contract',
      code: `
        // maximum retries
        export const MAX_RETRIES = 3;
      `,
      errors: [{ messageId: 'missingJsdoc' }],
    },
  ],
});
