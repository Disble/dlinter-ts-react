import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { strictColocation } from '../strict-colocation.js';

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

ruleTester.run('strict-colocation', strictColocation, {
  valid: [
    {
      name: 'named exported component with no root-level declarations',
      code: `
        export function StatusBadge({ label }: Readonly<StatusBadgeProps>) {
          return <span>{label}</span>;
        }
      `,
    },
    {
      name: 'exported hook as a named function declaration',
      code: `
        export function useClock() {
          return { now: Date.now() };
        }
      `,
    },
    {
      name: 'restricting checks lets role files keep their own declarations',
      options: [{ checks: ['inline-interface', 'inline-type-alias'] }],
      code: `
        export const MAX_RETRIES = 3;
      `,
    },
    {
      name: 'root function exported via export default specifier is the main module, not a helper',
      code: `
        function App() {
          return <span />;
        }

        export default App;
      `,
    },
    {
      name: 'root function exported via named specifier is not a helper',
      code: `
        function Badge() {
          return <span />;
        }

        export { Badge };
      `,
    },
  ],
  invalid: [
    {
      name: 'root-level variable is reported',
      code: `
        const cache = new Map<string, string>();

        export function Badge() {
          return <span>{cache.size}</span>;
        }
      `,
      errors: [{ messageId: 'rootVariable' }],
    },
    {
      name: 'root-level helper function is reported',
      code: `
        function formatLabel(label: string) {
          return label.trim();
        }

        export function Badge() {
          return <span>{formatLabel('x')}</span>;
        }
      `,
      errors: [{ messageId: 'rootHelperFunction' }],
    },
    {
      name: 'unexported capitalized root functions are helpers too, not private components',
      code: `
        function NavItem() {
          return <li />;
        }

        export function AppLayout() {
          return <nav><NavItem /></nav>;
        }
      `,
      errors: [{ messageId: 'rootHelperFunction' }],
    },
    {
      name: 'exporting the main module as a root-level const is reported',
      code: `
        export const Badge = () => <span />;
      `,
      errors: [{ messageId: 'exportedConst' }],
    },
    {
      name: 'default-exported arrow function is reported',
      code: `
        export default () => <span />;
      `,
      errors: [{ messageId: 'defaultArrowExport' }],
    },
    {
      name: 'inline interface is reported',
      code: `
        interface BadgeProps {
          readonly label: string;
        }

        export function Badge({ label }: Readonly<BadgeProps>) {
          return <span>{label}</span>;
        }
      `,
      errors: [{ messageId: 'inlineInterface' }],
    },
    {
      name: 'inline type alias is reported',
      code: `
        type BadgeTone = 'info' | 'error';

        export function Badge() {
          return <span />;
        }
      `,
      errors: [{ messageId: 'inlineTypeAlias' }],
    },
    {
      name: 'zod import outside a *.schema.ts file is reported',
      code: `
        import { z } from 'zod';

        export function useSeasonForm() {
          return z.object({});
        }
      `,
      errors: [{ messageId: 'zodImport' }],
    },
  ],
});
