# Adding a Rule — The Growth Recipe

**The answer first**: survey existing plugins before writing anything (custom rules exist ONLY for contracts no plugin ships), then follow the checklist below in order. The first step is always a RED test — a rule without a failing test proving it fires is a disabled rule.

## Before you write a line

| Question | If yes |
|----------|--------|
| Does an existing plugin ship this contract? (`import-x`, `check-file`, `sonarjs`, `jsdoc`, core `max-lines`…) | Bundle the wheel: enable it in the preset at upstream severity. See [severity-policy.md](./severity-policy.md) |
| Is it a project-specific detail (a Wails bridge, a tRPC client)? | It's an **option** on `createRecommendedConfig`, never a new rule or preset |
| Is it a genuine architecture contract no plugin ships (conditional folder ownership, pure barrels, hook anatomy…)? | Write the rule — continue below |

## Checklist

- [ ] 1. **RED test** in `src/rules/__tests__/<rule-name>.test.ts` using ESLint's `RuleTester` — at minimum one `invalid` case proving the rule fires and one `valid` case proving it stays quiet. Run it; watch it fail.
- [ ] 2. **Create the module** at `src/rules/<rule-name>/`:
  ```text
  src/rules/<rule-name>/
  ├── <rule-name>.ts             # the Rule.RuleModule (exported const — plugin contract)
  ├── <rule-name>.constants.ts   # root-level constants live here, never in the main module
  ├── <rule-name>.helpers.ts     # functions only (if needed)
  ├── <rule-name>.types.ts       # option types (if needed)
  └── index.ts                   # pure barrel: export { rule } from './<rule-name>.js'
  ```
  Single-file rules with no role siblings stay flat (`src/rules/<rule-name>.ts`) — `folder-ownership` only demands a folder once role files exist.
- [ ] 3. **Register** it in `src/plugin.ts` under its published name (`'<rule-name>': ruleExport`). This is the ONLY place configs learn about rules.
- [ ] 4. **Wire it into presets** in `src/configs/recommended/recommended.ts` — pick the glob block matching the role it governs, or add a block (BEFORE the final test-reset block). Update `allDlinterRulesOff` in `recommended.constants.ts` so tests stay exempt.
- [ ] 5. **Preset-level test** in `src/configs/__tests__/recommended.test.ts` — lint a virtual file through the real preset and assert the rule ID appears (glob wiring is part of the contract; RuleTester can't prove it).
- [ ] 6. **GREEN + gate**: `bun run validate`. Self-governance runs automatically — if your rule's own source violates the architecture (misplaced constant, impure barrel), the gate tells you.
- [ ] 7. **Document**: row in the README rules table; JSDoc on every export (enforced).

## Rule implementation patterns

### Rules are plain `Rule.RuleModule` const objects

The ESLint plugin contract requires exported const objects — this is the documented `exported-const` exception in self-governance. esquery selector strings are used directly as visitor keys:

```ts
create(context) {
  return {
    'Program > VariableDeclaration': (node) => context.report({ node, messageId: 'rootVariable' }),
  };
}
```

### `strict-colocation`: add checks to the fragment registry, never branch `create()`

Its visitor is built from a per-check fragment registry in `strict-colocation.helpers.ts` (`createCheckVisitors`). Each check ID owns a visitor fragment; the rule merges fragments for whichever checks its options enable. **A new check = a new registry entry + a new entry in `allChecks`** — never a new `if` inside `create()`.

### `folder-ownership`: filesystem-reading rules self-guard

It reads the REAL filesystem (`existsSync`) to detect role-file siblings, and skips role files, `index.ts`, and `.d.ts` itself — regardless of config globs. If your rule reads the filesystem, make it self-guarding the same way, and test it with real fixture files under `src/rules/__tests__/__fixtures__/<rule-name>/` (RED/GREEN fixture folders), not virtual paths.

### Message discipline

Every message is a named `messageId` with a sentence that teaches the contract ("Split module ownership: flat main modules with sibling role files must move into a dedicated folder…"). The message is documentation at the moment of violation — write it for the developer who has never read these docs.

## What a rule must never do

| Never | Because |
|-------|---------|
| Import from `configs/`, `plugin.ts`, `cli/`, or the entrypoint | Rules are the leaf layer — machine-enforced by self-governance |
| Reference a consuming project by name | Project specifics are options; presets are architecture concepts |
| Ship without a failing test proving it fires | Strict TDD is the methodology, not a preference |
| Share a `no-restricted-syntax` slot | Every contract gets its own rule ID, docs, and per-rule disable |
