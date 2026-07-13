import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createRecommendedConfig } from '../recommended/index.js';
import { typescriptTypeCheckedOnlyRules } from '../recommended/recommended.constants.js';

// Harness suffix shared by every config variant in this suite:
// - Virtual fixtures import modules that do not exist on disk. Module
//   resolution belongs to the consumer project; this suite tests policy.
// - Virtual files exist only in memory — no TypeScript program can include
//   them, so the type-checked tier cannot run here. It is covered against a
//   real fixture project in recommended-typed.test.ts; every other severity
//   decision is exercised here unchanged.
const virtualHarnessOverrides: Linter.Config[] = [
  {
    rules: {
      'import-x/no-unresolved': 'off',
    },
  },
  {
    settings: {
      react: { version: '19.2' },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: Object.fromEntries(
      Object.keys(typescriptTypeCheckedOnlyRules).map((ruleId) => [ruleId, 'off']),
    ) as Linter.RulesRecord,
  },
];

const recommendedForWailsLikeProject: Linter.Config[] = [
  ...createRecommendedConfig({
    infrastructure: {
      importPatterns: ['(^|/)wailsjs(/|$)'],
      runtimeGlobals: ['window.go'],
    },
  }),
  ...virtualHarnessOverrides,
];

function createEslint(): ESLint {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: recommendedForWailsLikeProject,
  });
}

async function lintVirtualFile(code: string, filePath: string) {
  const eslint = createEslint();
  const [result] = await eslint.lintText(code, { filePath });
  return result;
}

function errorRuleIds(result: Awaited<ReturnType<typeof lintVirtualFile>>): readonly string[] {
  return (result?.messages ?? [])
    .filter((message) => message.severity === 2)
    .map((message) => message.ruleId ?? '');
}

describe('createRecommendedConfig infrastructure edge', () => {
  // The boundary rule entry is attached to more than one glob group; every copy
  // must carry identical options, so reading the first array entry is enough.
  function infrastructureRuleOptions(
    configs: Linter.Config[],
  ): { importPatterns: readonly string[]; runtimeGlobals: readonly string[] } | undefined {
    for (const config of configs) {
      const entry = config.rules?.['dlinter/no-infrastructure-in-view'];
      if (Array.isArray(entry)) {
        return entry[1] as { importPatterns: readonly string[]; runtimeGlobals: readonly string[] };
      }
    }
    return undefined;
  }

  it('defaults runtimeGlobals to [] when only importPatterns is given', () => {
    const options = infrastructureRuleOptions(
      createRecommendedConfig({ infrastructure: { importPatterns: ['(^|/)infrastructure(/|$)'] } }),
    );

    expect(options).toEqual({
      importPatterns: ['(^|/)infrastructure(/|$)'],
      runtimeGlobals: [],
    });
  });

  it('defaults importPatterns to [] when only runtimeGlobals is given', () => {
    const options = infrastructureRuleOptions(
      createRecommendedConfig({ infrastructure: { runtimeGlobals: ['window.go'] } }),
    );

    expect(options).toEqual({
      importPatterns: [],
      runtimeGlobals: ['window.go'],
    });
  });
});

describe('recommended config', () => {
  it('flags useEffect inside a view through dlinter/no-view-effects', async () => {
    const result = await lintVirtualFile(
      `
        import { useEffect } from 'react';

        /**
         * Renders the running clock.
         */
        export function Clock() {
          useEffect(() => {}, []);
          return <time />;
        }
      `,
      'src/features/clock/Clock.tsx',
    );

    expect(errorRuleIds(result)).toContain('dlinter/no-view-effects');
  });

  it('flags configured infrastructure imports in views', async () => {
    const result = await lintVirtualFile(
      `
        import { GetSeasons } from '../../wailsjs/go/main/App';

        /**
         * Renders the seasons list.
         */
        export function SeasonList() {
          return <ul>{String(GetSeasons)}</ul>;
        }
      `,
      'src/features/seasons/SeasonList.tsx',
    );

    expect(errorRuleIds(result)).toContain('dlinter/no-infrastructure-in-view');
  });

  it('flags anatomy violations in hooks through dlinter/hook-anatomy', async () => {
    const result = await lintVirtualFile(
      `
        import { useEffect, useMemo } from 'react';

        /**
         * Synchronizes the selected season.
         */
        export function useSeasonSync() {
          useEffect(() => {}, []);
          const label = useMemo(() => 'season', []);
          return { label };
        }
      `,
      'src/features/seasons/use-season-sync.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/hook-anatomy');
  });

  it('keeps delivery files composition-only', async () => {
    const result = await lintVirtualFile(
      `
        import { useState } from 'react';

        /**
         * Application shell.
         */
        export function Shell() {
          const [open] = useState(false);
          return <div>{open}</div>;
        }
      `,
      'src/app/Shell.tsx',
    );

    expect(errorRuleIds(result)).toContain('dlinter/composition-only-delivery');
  });

  it('requires readonly Props fields in *.types.ts contracts', async () => {
    const result = await lintVirtualFile(
      `
        /**
         * Props for the clock view.
         */
        export interface ClockProps {
          label: string;
        }
      `,
      'src/features/clock/clock.types.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/readonly-props');
  });

  it('accepts interfaces in a hook-sibling *.types.ts role file', async () => {
    // Regression: the hook block glob `src/**/use-*.ts` also matched
    // `use-*.types.ts`, leaking the full strict-colocation check set (including
    // inline-interface) onto a role file whose entire purpose is to hold
    // interfaces — a self-contradictory diagnostic. Role files are not the
    // hook main module and must be exempt from the hook contract.
    const result = await lintVirtualFile(
      `
        /**
         * Result contract for the async list hook.
         */
        export interface UseAsyncListResult<T> {
          readonly isLoading: boolean;
          readonly items: readonly T[];
          readonly reload: () => void;
        }
      `,
      'src/shared/hooks/use-async-list/use-async-list.types.ts',
    );

    expect(errorRuleIds(result)).not.toContain('dlinter/strict-colocation');
  });

  it('enforces colocation in governed main modules', async () => {
    const result = await lintVirtualFile(
      `
        interface ClockParts {
          readonly hours: number;
        }

        /**
         * Formats clock parts for display.
         */
        export function formatClock(parts: ClockParts) {
          return String(parts.hours);
        }
      `,
      'src/features/clock/format-clock.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/strict-colocation');
  });

  it('flags root-level constants in helpers role files', async () => {
    const result = await lintVirtualFile(
      `
        const EMPTY_BOARD = { rail: [], grid: [] };

        /**
         * Builds the default ordering board.
         */
        export function createOrderingBoard() {
          return EMPTY_BOARD;
        }
      `,
      'src/features/seasons/season-source.helpers.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/strict-colocation');
  });

  it('keeps a compliant helpers role file green', async () => {
    const result = await lintVirtualFile(
      `
        import { EMPTY_SEASON_LABEL } from './season.constants';

        /**
         * Formats the season label with the shared fallback.
         */
        export function formatSeasonLabel(label: string) {
          return label.trim() || EMPTY_SEASON_LABEL;
        }
      `,
      'src/features/seasons/season.helpers.ts',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('keeps a delivery main component exported via default specifier green', async () => {
    const result = await lintVirtualFile(
      `
        import { SeasonRoute } from './app/routes/SeasonRoute';

        function App() {
          return <SeasonRoute />;
        }

        export default App;
      `,
      'src/App.tsx',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('requires JSDoc on exported functions through the bundled jsdoc plugin', async () => {
    const result = await lintVirtualFile(
      `
        export function formatClock(hours: number) {
          return String(hours);
        }
      `,
      'src/features/clock/format-clock.ts',
    );

    expect(errorRuleIds(result)).toContain('jsdoc/require-jsdoc');
  });

  it('requires JSDoc on exported constants in role files', async () => {
    const result = await lintVirtualFile(
      `
        export const TICK_INTERVAL_MS = 1000;
      `,
      'src/features/clock/clock.constants.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/require-exported-variable-jsdoc');
  });

  it('requires index.ts entrypoints to be pure barrels', async () => {
    const result = await lintVirtualFile(
      `
        export const registry = new Map();
      `,
      'src/features/clock/index.ts',
    );

    expect(errorRuleIds(result)).toContain('dlinter/pure-index-barrel');
  });

  it('keeps a pure re-export barrel green', async () => {
    const result = await lintVirtualFile(
      `
        export { Clock } from './Clock';
        export type { ClockProps } from './clock.types';
      `,
      'src/features/clock/index.ts',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('leaves test files outside the architecture contract', async () => {
    // A realistic test file: root-level fixture const, inline interface, and
    // an undocumented exported helper — all architecture violations elsewhere,
    // all exempt here. It contains a real test case because sonarjs'
    // no-empty-test-file stays ON in tests (an empty test file is a silently
    // dead test, not a shape concern).
    const result = await lintVirtualFile(
      `
        import { describe, expect, it } from 'vitest';

        const fixtures = ['nineties'];

        interface HarnessShape {
          label: string;
        }

        export function renderHarness(): HarnessShape {
          return { label: fixtures[0] ?? '' };
        }

        describe('clock harness', () => {
          it('renders the harness label', () => {
            expect(renderHarness().label).toBe('nineties');
          });
        });
      `,
      'src/features/clock/__tests__/Clock.test.tsx',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('keeps a fully compliant view green', async () => {
    const result = await lintVirtualFile(
      `
        /**
         * Renders the season badge.
         */
        export function SeasonBadge({ label }: Readonly<SeasonBadgeProps>) {
          return <span>{label}</span>;
        }
      `,
      'src/features/seasons/SeasonBadge.tsx',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('keeps a fully compliant hook green', async () => {
    const result = await lintVirtualFile(
      `
        import { useMemo } from 'react';

        /**
         * Provides the formatted season label.
         */
        export function useSeasonLabel() {
          const label = useMemo(() => 'season', []);
          return { label };
        }
      `,
      'src/features/seasons/use-season-label.ts',
    );

    expect(result?.errorCount).toBe(0);
  });
});

describe('recommended config — react-doctor severity policy', () => {
  it('surfaces an upstream-error react-doctor rule as an error, not a downgraded warning', async () => {
    const result = await lintVirtualFile(
      `
        /**
         * Renders the brand logo.
         */
        export function BrandLogo({ src }: Readonly<BrandLogoProps>) {
          return <img alt="brand" src={src} src={src} />;
        }
      `,
      'src/features/brand/BrandLogo.tsx',
    );

    // jsx-no-duplicate-props is a definite bug and ships at "error" upstream;
    // the old blanket downgrade demoted it to a warning that never blocks.
    expect(errorRuleIds(result)).toContain('react-doctor/jsx-no-duplicate-props');
  });
});

describe('recommended config — sonarjs severity policy', () => {
  it('surfaces an upstream-error sonarjs bug rule as an error', async () => {
    const result = await lintVirtualFile(
      `
        /**
         * Picks the season label variant.
         */
        export function pickSeasonVariant(flag: boolean) {
          if (flag) {
            return 'season';
          } else {
            return 'season';
          }
        }
      `,
      'src/features/seasons/season.helpers.ts',
    );

    // Identical if/else branches are a definite copy-paste bug. Upstream ships
    // no-all-duplicated-branches at "error" — and this exact rule was one of
    // the five the old preset blanket-downgraded to warn. Respecting the
    // plugin's own triage means it blocks now.
    expect(errorRuleIds(result)).toContain('sonarjs/no-all-duplicated-branches');
  });

  it('keeps todo-tag advisory through a surgical override, never blocking', async () => {
    const result = await lintVirtualFile(
      `
        // TODO: swap the fallback once the season API ships pagination.

        /**
         * Formats the season label.
         */
        export function formatSeasonLabel(label: string) {
          return label.trim();
        }
      `,
      'src/features/seasons/season.helpers.ts',
    );

    const warningRuleIds = (result?.messages ?? [])
      .filter((message) => message.severity === 1)
      .map((message) => message.ruleId ?? '');

    // TODO comments are tracked work, not defects. Upstream ships todo-tag at
    // "error"; the preset downgrades this ONE named rule with a documented
    // reason — the surgical exception that proves severities are triaged, not
    // swept.
    expect(warningRuleIds).toContain('sonarjs/todo-tag');
    expect(errorRuleIds(result)).not.toContain('sonarjs/todo-tag');
  });
});

describe('recommended config — react compiler option', () => {
  const memoizingHook = `
    import { useMemo } from 'react';

    /**
     * Provides the formatted season label.
     */
    export function useSeasonLabel() {
      const label = useMemo(() => 'season', []);
      return { label };
    }
  `;

  async function lintHookWithReactCompiler(reactCompiler: boolean) {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...createRecommendedConfig({ reactCompiler }), ...virtualHarnessOverrides],
    });
    const [result] = await eslint.lintText(memoizingHook, {
      filePath: 'src/features/seasons/use-season-label.ts',
    });
    return result;
  }

  it('activates no-manual-memoization when the project compiles with React Compiler', async () => {
    const result = await lintHookWithReactCompiler(true);
    const firedRuleIds = (result?.messages ?? []).map((message) => message.ruleId ?? '');

    // With the compiler, manual useMemo/useCallback is redundant noise — the
    // upstream rule exists exactly for this and must come back to life.
    expect(firedRuleIds).toContain('react-doctor/react-compiler-no-manual-memoization');
  });

  it('keeps no-manual-memoization off without the compiler (manual memoization is load-bearing)', async () => {
    const result = await lintHookWithReactCompiler(false);
    const firedRuleIds = (result?.messages ?? []).map((message) => message.ruleId ?? '');

    expect(firedRuleIds).not.toContain('react-doctor/react-compiler-no-manual-memoization');
  });
});

describe('recommended config — @typescript-eslint severity policy', () => {
  it('surfaces upstream-error typescript-eslint rules as errors', async () => {
    const result = await lintVirtualFile(
      `
        /**
         * Formats an arbitrary payload for display.
         */
        export function formatPayload(payload: any) {
          return String(payload);
        }
      `,
      'src/features/seasons/format-payload.ts',
    );

    expect(errorRuleIds(result)).toContain('@typescript-eslint/no-explicit-any');
  });
});
