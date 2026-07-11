import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { readonlyProps } from '../readonly-props/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('readonly-props', readonlyProps, {
  valid: [
    {
      name: 'Readonly<Props> at the function boundary stays green',
      code: `
        export function StatusBadge(props: Readonly<StatusBadgeProps>) {
          return <span>{props.label}</span>;
        }
      `,
    },
    {
      name: 'destructured Readonly<Props> boundary stays green',
      code: `
        export function StatusBadge({ label }: Readonly<StatusBadgeProps>) {
          return <span>{label}</span>;
        }
      `,
    },
    {
      name: 'Props interface with only readonly fields stays green',
      code: `
        export interface StatusBadgeProps {
          readonly label: string;
          readonly tone: 'info' | 'error';
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'bare Props parameter type is reported',
      code: `
        export function StatusBadge(props: StatusBadgeProps) {
          return <span>{props.label}</span>;
        }
      `,
      errors: [{ messageId: 'boundaryNotReadonly' }],
    },
    {
      name: 'destructured bare Props parameter type is reported',
      code: `
        export function StatusBadge({ label }: StatusBadgeProps) {
          return <span>{label}</span>;
        }
      `,
      errors: [{ messageId: 'boundaryNotReadonly' }],
    },
    {
      name: 'mutable field inside a Props interface is reported',
      code: `
        export interface StatusBadgeProps {
          label: string;
        }
      `,
      errors: [{ messageId: 'propsFieldNotReadonly' }],
    },
  ],
});
