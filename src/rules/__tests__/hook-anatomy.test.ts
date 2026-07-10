import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { hookAnatomy } from '../hook-anatomy.js';

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

ruleTester.run('hook-anatomy', hookAnatomy, {
  valid: [
    {
      name: 'derived state, then callbacks, then effects, ending with a return',
      code: `
        import { useCallback, useEffect, useMemo, useState } from 'react';

        export function useCartTotal() {
          const [items, setItems] = useState([]);
          const total = useMemo(() => items.length, [items]);
          const reset = useCallback(() => setItems([]), []);

          useEffect(() => {
            console.log(total);
          }, [total]);

          return { total, reset };
        }
      `,
    },
    {
      name: 'non-hook exported functions are outside the anatomy contract',
      code: `
        export function formatTotal(total: number) {
          console.log(total);
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'useEffect before derived state is reported',
      code: `
        import { useEffect, useMemo } from 'react';

        export function useSeasonSync() {
          useEffect(() => {}, []);
          const label = useMemo(() => 'season', []);
          return { label };
        }
      `,
      errors: [{ messageId: 'effectBeforeDerived' }],
    },
    {
      name: 'useCallback before useMemo is reported',
      code: `
        import { useCallback, useMemo } from 'react';

        export function useSeasonActions() {
          const reset = useCallback(() => {}, []);
          const label = useMemo(() => 'season', []);
          return { reset, label };
        }
      `,
      errors: [{ messageId: 'memoAfterCallback' }],
    },
    {
      name: 'a hook that does not end with a return statement is reported',
      code: `
        import { useMemo } from 'react';

        export function useSeasonLabel() {
          const label = useMemo(() => 'season', []);
        }
      `,
      errors: [{ messageId: 'missingReturn' }],
    },
  ],
});
