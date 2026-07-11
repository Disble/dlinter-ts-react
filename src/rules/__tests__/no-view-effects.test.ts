import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { noViewEffects } from '../no-view-effects/index.js';

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

ruleTester.run('no-view-effects', noViewEffects, {
  valid: [
    {
      name: 'presentational component without side effects stays green',
      code: `
        export function StatusBadge({ label }: Readonly<StatusBadgeProps>) {
          return <span>{label}</span>;
        }
      `,
    },
    {
      name: 'derived state through useMemo is not a side effect',
      code: `
        import { useMemo } from 'react';

        export function TotalLabel({ items }: Readonly<TotalLabelProps>) {
          const total = useMemo(() => items.length, [items]);
          return <span>{total}</span>;
        }
      `,
    },
    {
      name: 'custom hooks whose names merely start with useEffect-like prefixes stay green',
      code: `
        export function Panel() {
          const value = useEffectiveTheme();
          return <div>{value}</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'useEffect in a view is reported',
      code: `
        import { useEffect } from 'react';

        export function Clock() {
          useEffect(() => {
            document.title = 'tick';
          }, []);
          return <time />;
        }
      `,
      errors: [{ messageId: 'viewEffectForbidden', data: { hookName: 'useEffect' } }],
    },
    {
      name: 'useLayoutEffect in a view is reported',
      code: `
        import { useLayoutEffect } from 'react';

        export function Measured() {
          useLayoutEffect(() => {}, []);
          return <div />;
        }
      `,
      errors: [{ messageId: 'viewEffectForbidden', data: { hookName: 'useLayoutEffect' } }],
    },
    {
      name: 'effects reached through the React namespace are reported',
      code: `
        import React from 'react';

        export function Clock() {
          React.useEffect(() => {}, []);
          return <time />;
        }
      `,
      errors: [{ messageId: 'viewEffectForbidden', data: { hookName: 'useEffect' } }],
    },
  ],
});
