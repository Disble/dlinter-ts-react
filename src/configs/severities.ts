import type { Linter } from 'eslint';

/**
 * Re-emits a rules map with every active severity downgraded to "warn".
 * Used to surface advisory plugins (react-doctor) as warnings instead of hard
 * errors that would break the gate on pre-existing patterns.
 * @param rules - source rules map keyed by rule name.
 * @returns the same rules with non-off severities set to "warn".
 */
export function downgradeRuleSeverities(rules: Record<string, unknown>): Linter.RulesRecord {
  return Object.fromEntries(
    Object.entries(rules).map(([ruleName, ruleValue]) => {
      if (ruleValue === 'off' || ruleValue === 0) {
        return [ruleName, 'off'];
      }

      if (Array.isArray(ruleValue)) {
        return [ruleName, ['warn', ...ruleValue.slice(1)]];
      }

      return [ruleName, 'warn'];
    }),
  ) as Linter.RulesRecord;
}
