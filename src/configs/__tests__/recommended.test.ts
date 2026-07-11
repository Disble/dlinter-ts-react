import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createRecommendedConfig } from '../recommended/index.js';

const recommendedForWailsLikeProject: Linter.Config[] = [
  ...createRecommendedConfig({
    infrastructure: {
      importPatterns: ['(^|/)wailsjs(/|$)'],
      runtimeGlobals: ['window.go'],
    },
  }),
  // Virtual fixtures import modules that do not exist on disk. Module
  // resolution belongs to the consumer project; this suite tests policy.
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
    const result = await lintVirtualFile(
      `
        const fixtures = ['nineties'];

        interface HarnessShape {
          label: string;
        }

        export function renderHarness(): HarnessShape {
          return { label: fixtures[0] ?? '' };
        }
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
