import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { compositionOnlyDelivery } from '../composition-only-delivery.js';

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

ruleTester.run('composition-only-delivery', compositionOnlyDelivery, {
  valid: [
    {
      name: 'delivery file that only composes feature entrypoints stays green',
      code: `
        import { SeasonDashboard } from '../features/seasons/SeasonDashboard';

        export function App() {
          return <SeasonDashboard />;
        }
      `,
    },
    {
      name: 'importing non-hook members from react stays green',
      code: `
        import { StrictMode } from 'react';

        export function App() {
          return <StrictMode />;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'importing a React hook in a delivery file is reported',
      code: `
        import { useState } from 'react';

        export function App() {
          const [open] = useState(false);
          return <div>{open}</div>;
        }
      `,
      errors: [{ messageId: 'reactHookImport' }],
    },
    {
      name: 'calling a React hook through the namespace is reported',
      code: `
        import React from 'react';

        export function App() {
          const ref = React.useRef(null);
          return <div ref={ref} />;
        }
      `,
      errors: [{ messageId: 'reactHookNamespace' }],
    },
    {
      name: 'importing a custom hook module in a delivery file is reported',
      code: `
        import { useSeasons } from '../features/seasons/use-seasons';

        export function App() {
          const { seasons } = useSeasons();
          return <div>{seasons}</div>;
        }
      `,
      errors: [{ messageId: 'customHookImport' }],
    },
  ],
});
