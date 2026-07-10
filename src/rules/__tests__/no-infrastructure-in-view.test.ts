import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { noInfrastructureInView } from '../no-infrastructure-in-view.js';

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

const wailsLikeOptions = [
  {
    importPatterns: ['(^|/)wailsjs(/|$)'],
    runtimeGlobals: ['window.go'],
  },
];

ruleTester.run('no-infrastructure-in-view', noInfrastructureInView, {
  valid: [
    {
      name: 'view that reaches infrastructure through its colocated hook stays green',
      options: wailsLikeOptions,
      code: `
        import { useSeasons } from './use-seasons';

        export function SeasonList() {
          const { seasons } = useSeasons();
          return <ul>{seasons}</ul>;
        }
      `,
    },
    {
      name: 'without configured boundaries the rule stays inert',
      code: `
        import { GetSeasons } from '../../wailsjs/go/main/App';

        export function SeasonList() {
          return <ul>{String(GetSeasons)}</ul>;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'importing a configured infrastructure binding is reported',
      options: wailsLikeOptions,
      code: `
        import { GetSeasons } from '../../wailsjs/go/main/App';

        export function SeasonList() {
          return <ul>{String(GetSeasons)}</ul>;
        }
      `,
      errors: [{ messageId: 'infrastructureImport' }],
    },
    {
      name: 'touching a configured runtime global is reported',
      options: wailsLikeOptions,
      code: `
        export function SeasonList() {
          const bridge = window.go.main.App;
          return <ul>{String(bridge)}</ul>;
        }
      `,
      errors: [{ messageId: 'infrastructureRuntime' }],
    },
  ],
});
