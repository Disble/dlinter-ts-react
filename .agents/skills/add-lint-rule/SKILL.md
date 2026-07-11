---
name: add-lint-rule
description: "Trigger: add rule, new ESLint rule, custom rule, dlinter rule, new architecture contract. Create a dlinter rule TDD-first and wire it into the preset."
license: MIT
metadata:
  author: disble
  version: "1.0"
---

## Activation Contract

Use when adding or extending a `dlinter/*` rule in this repo. Do NOT use for severity changes to bundled plugins — that is `severity-triage`.

## Hard Rules

- RED first: write a failing `RuleTester` test and RUN it before any implementation. A rule without a failing test proving it fires is a disabled rule.
- Survey existing plugins first (import-x, check-file, sonarjs, jsdoc, core). Custom rules exist ONLY for contracts no plugin ships.
- Rules are the leaf layer: never import from `src/configs/`, `src/plugin.ts`, `src/cli/`, or `src/index.ts` (self-governance fails the commit).
- Rules are exported const `Rule.RuleModule` objects with named `messageId`s whose text teaches the contract.
- Project specifics (Wails, tRPC) are `createRecommendedConfig` OPTIONS, never rules or presets.

## Decision Gates

| Situation | Action |
|-----------|--------|
| Contract already shipped by a plugin | Enable it in the preset instead — see severity-triage |
| Rule needs role files (constants/helpers/types) | Folder-owned module: `src/rules/<name>/` + pure `index.ts` |
| Single-file rule, no role siblings | Flat file `src/rules/<name>.ts` is fine |
| Extending strict-colocation | New entry in the check-fragment registry in `strict-colocation.helpers.ts` + `allChecks`; never a branch in `create()` |
| Rule reads the filesystem | Self-guard scope like folder-ownership; test with REAL fixture files under `src/rules/__tests__/__fixtures__/<name>/` |

## Execution Steps

1. RED `RuleTester` test in `src/rules/__tests__/<name>.test.ts` (invalid + valid cases). Watch it fail.
2. Implement the module; register it in `src/plugin.ts` under its published name.
3. Wire into `src/configs/recommended/recommended.ts` in the glob block matching the governed role — BEFORE the final test-reset block. Add the rule to `allDlinterRulesOff`.
4. Preset-level test in `src/configs/__tests__/recommended.test.ts` (virtual file through the real preset; assert the rule ID in `errorRuleIds`).
5. `bun run validate`. Add the README rules-table row. JSDoc every export.

## Output Contract

Report: rule name, files created, preset block wired, RED evidence (the failing run), and final validate result.

## References

- `docs/adding-a-rule.md` — full recipe and implementation patterns.
- `docs/architecture.md` — layer contract and block ordering.
