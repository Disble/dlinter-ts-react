import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import dlinter from '../../index.js';

function createEslint(): ESLint {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: dlinter.configs['dumb-ui'],
  });
}

async function lintVirtualFile(code: string, filePath: string) {
  const eslint = createEslint();
  const [result] = await eslint.lintText(code, { filePath });
  return result;
}

describe('dumb-ui config', () => {
  it('reports dlinter/no-view-effects for a .tsx view calling useEffect', async () => {
    const result = await lintVirtualFile(
      `
        import { useEffect } from 'react';

        export function Clock() {
          useEffect(() => {}, []);
          return <time />;
        }
      `,
      'src/features/clock/Clock.tsx',
    );

    expect(result?.errorCount).toBe(1);
    expect(result?.messages[0]?.ruleId).toBe('dlinter/no-view-effects');
  });

  it('leaves colocated hooks (use-*.ts) free to run effects', async () => {
    const result = await lintVirtualFile(
      `
        import { useEffect, useState } from 'react';

        export function useClock() {
          const [now, setNow] = useState(() => new Date());

          useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(timer);
          }, []);

          return { now };
        }
      `,
      'src/features/clock/use-clock.ts',
    );

    expect(result?.errorCount).toBe(0);
  });

  it('keeps a compliant presentational view green', async () => {
    const result = await lintVirtualFile(
      `
        export function StatusBadge({ label }: Readonly<StatusBadgeProps>) {
          return <span>{label}</span>;
        }
      `,
      'src/shared/ui/StatusBadge.tsx',
    );

    expect(result?.errorCount).toBe(0);
  });
});
