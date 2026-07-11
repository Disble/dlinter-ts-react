import { readFileSync } from 'node:fs';

import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactDoctor from 'eslint-plugin-react-doctor';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const contractsDir = new URL('./upstream-severity-contracts/', import.meta.url);

function loadContract(fileName: string): readonly string[] {
  return JSON.parse(readFileSync(new URL(fileName, contractsDir), 'utf8')) as string[];
}

const reactDoctorContract = loadContract('react-doctor.json');
const sonarjsContract = loadContract('sonarjs.json');
const tsRecommendedContract = loadContract('typescript-eslint-recommended.json');
const tsTypeCheckedOnlyContract = loadContract('typescript-eslint-type-checked-only.json');

// SEVERITY POLICY DRIFT GUARDS
//
// The recommended preset respects each bundled plugin's own per-rule triage
// (spread as-is) and re-tunes only named rule IDs with documented reasons —
// see reactDoctorSurgicalOverrides / sonarjsSurgicalOverrides in
// recommended.constants.ts. That only stays honest if the upstream error-set
// cannot shift silently underneath us: every plugin whose config we spread is
// pinned to an EXACT version in package.json, and these tests lock the exact
// set of rules each plugin ships at "error".
//
// If a deliberate plugin bump changes a set, this test fails. That is the
// point: re-triage the surgical overrides for the new/changed rules, then
// regenerate the matching contract JSON. NEVER "fix" a failure here by
// re-adding a blanket severity sweep.

function upstreamErrorRules(rules: Record<string, unknown>): readonly string[] {
  const severityOf = (value: Linter.RuleEntry): unknown => (Array.isArray(value) ? value[0] : value);

  return Object.entries(rules)
    .filter(([, value]) => {
      const severity = severityOf(value as Linter.RuleEntry);
      return severity === 'error' || severity === 2;
    })
    .map(([ruleId]) => ruleId)
    .sort();
}

const tsPluginConfigs = tsPlugin.configs as Record<string, { rules?: Record<string, unknown> }>;

describe('upstream severity contracts', () => {
  it('react-doctor recommended ships the locked error-set', () => {
    expect(upstreamErrorRules(reactDoctor.configs.recommended.rules)).toEqual(reactDoctorContract);
  });

  it('sonarjs recommended ships the locked error-set', () => {
    expect(
      upstreamErrorRules(
        (sonarjsPlugin.configs as Record<string, { rules?: Record<string, unknown> }>).recommended
          ?.rules ?? {},
      ),
    ).toEqual(sonarjsContract);
  });

  it('@typescript-eslint recommended ships the locked error-set', () => {
    expect(upstreamErrorRules(tsPluginConfigs['recommended']?.rules ?? {})).toEqual(
      tsRecommendedContract,
    );
  });

  it('@typescript-eslint recommended-type-checked-only ships the locked error-set', () => {
    expect(upstreamErrorRules(tsPluginConfigs['recommended-type-checked-only']?.rules ?? {})).toEqual(
      tsTypeCheckedOnlyContract,
    );
  });
});
