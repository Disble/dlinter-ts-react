---
name: severity-triage
description: "Trigger: rule severity, downgrade rule, plugin bump, drift test failure, add plugin, upstream severities. Triage bundled-plugin severities without blanket sweeps."
license: MIT
metadata:
  author: disble
  version: "1.0"
---

## Activation Contract

Use when changing any bundled plugin's rule severity, adding a plugin to the preset, or when `upstream-severity-drift.test.ts` fails after a dependency bump.

## Hard Rules

- NEVER blanket-downgrade a plugin's ruleset. Spread the plugin's recommended rules AS-IS; override only NAMED rule IDs, each with a reason comment. A `downgradeRuleSeverities`-style sweep is the forbidden anti-pattern.
- Reasons that qualify: another rule OWNS the contract; true non-defect (tracked TODOs, non-crypto Math.random); context-specific misfire (tests, missing React Compiler → scope-limit or option-gate).
- Reasons that do NOT qualify: "it is a heuristic", "threshold is opinionated", "awkward in JSX". Fallow-audit and SonarQube Cloud alignment are reasons to KEEP upstream error.
- Every spread plugin is pinned EXACT in package.json and its error-set locked by a JSON contract. New spread plugin = new pin + new contract + drift test case.
- Local verdicts must predict SonarQube Cloud verdicts — never silence locally what Cloud will flag.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Drift test fails after a bump | Follow the bump playbook below — the failure IS the feature |
| Rule misfires only in tests | Add to `sonarjsTestContextOverrides` (mirrors SonarQube reduced test profile) |
| Rule needs a consumer capability | Option-gate on `createRecommendedConfig` (precedent: `reactCompiler`) |
| Existing green fixture now fails | If the new verdict is CORRECT for real projects, fix the fixture (precedent: no-empty-test-file); if a misfire, named override with reason |

## Execution Steps

1. Diff the drift failure: which rule IDs entered/left/changed tier.
2. Triage each with the decision procedure in `docs/severity-policy.md`; add named overrides in `src/configs/recommended/recommended.constants.ts` with reason comments.
3. Regenerate the contract JSON in `src/configs/__tests__/upstream-severity-contracts/` (dump runtime rules, filter error, sort).
4. Add/adjust a behavioral test proving the decision (error fires / warning holds).
5. `bun run validate`; update the README severity section and the override ledger.

## Output Contract

Report: rules triaged with verdict + reason each, contracts regenerated, tests added, validate result.

## References

- `docs/severity-policy.md` — policy, ledger, bump playbook.
- `src/configs/recommended/recommended.constants.ts` — the override constants.
