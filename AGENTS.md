# AGENTS.md

This file gives coding agents project-specific context. Keep it short and update it when workflows change.

Detailed documentation (architecture diagrams, severity-policy ledger + plugin-bump playbook, add-a-rule recipe, testing harness constraints) lives in `docs/` — start at `docs/README.md`, which routes by task.

## Project Overview

- Primary app or package: `dlinter-ts-react` — an npm package shipping deterministic architecture governance for TS + React projects: custom ESLint rules, architecture-concept presets, and a CLI that scaffolds the pre-commit gate.
- Main entry points: `src/index.ts` (plugin + configs + `createRecommendedConfig`), `src/cli/index.ts` (`dlinter` bin).
- Important directories: `src/rules/` (folder-owned rule modules + `__tests__/`), `src/configs/` (preset factories), `src/cli/` (scaffolder).

## Architecture Notes

- Layer contract (ENFORCED by `src/__tests__/self-governance.test.ts` via `no-restricted-imports`, not just prose): import direction is one-way — `src/index.ts` → `src/configs/` → `src/plugin.ts` → `src/rules/`. `src/cli/` is a standalone bin entry that never touches the plugin side. Configs consume the rule registry through `pluginBase`, never by importing rules or the entrypoint back.
- Self-governance: the repo lints itself with the universal subset of its own rules (strict-colocation, folder-ownership, pure-index-barrel, require-exported-variable-jsdoc, jsdoc/require-jsdoc, max-lines 500) inside `bun run validate`. Documented exceptions: `exported-const` check is off (the ESLint contract requires rule modules to be exported const objects), and `src/index.ts` + `src/cli/index.ts` are package entrypoints, not barrels.
- Adding a rule (growth recipe): create `src/rules/<rule-name>/` with `<rule-name>.ts`, role files as needed (`*.constants.ts`, `*.helpers.ts`, `*.types.ts`), and a pure `index.ts`; register it in `src/plugin.ts`; RED-first `RuleTester` test in `src/rules/__tests__/`. Misplaced declarations fail the self-governance gate automatically.
- Rules are plain `Rule.RuleModule` objects; esquery selector strings are used directly as visitor keys. `strict-colocation` builds its visitor from a per-check fragment registry in its `.helpers.ts` — add checks as registry entries, never as new branches in `create()`.
- Presets are named after architecture CONCEPTS (`dumb-ui`, `recommended`), never after consuming projects. Project specifics (e.g. Wails) are rule OPTIONS.
- Don't reinvent the wheel: before writing a custom rule, survey existing ESLint plugins (see README design table). Custom rules exist only for contracts no plugin ships.
- Severity policy (NEVER blanket-downgrade a third-party plugin): a bundled plugin's per-rule severities are the plugin author's triage — spread them AS-IS and override only named rule IDs, each with a documented reason. This applies to every plugin whose config the preset spreads: `react-doctor` (34 error / ~198 warn), `sonarjs` (206 error / 62 off), `@typescript-eslint` recommended (20 error) + type-checked-only (23 error, `src/**` via projectService, tests exempt). Surgical overrides live in `src/configs/recommended/recommended.constants.ts` (`reactDoctorSurgicalOverrides`, `sonarjsSurgicalOverrides`, `sonarjsTestContextOverrides`) — each entry carries a reason comment. Every spread plugin is pinned to an EXACT version in `package.json`, and each upstream error-set is locked by `src/configs/__tests__/upstream-severity-drift.test.ts` against the JSON contracts in `src/configs/__tests__/upstream-severity-contracts/`. If a plugin bump changes an error-set, the drift test fails — re-triage deliberately (update overrides + regenerate the matching contract JSON), never re-add a bulk `downgradeRuleSeverities`-style sweep.
- Type-checked linting: the recommended preset enables `parserOptions.projectService` on `src/**/*.{ts,tsx}` (tests exempt) to run @typescript-eslint's type-checked tier. Virtual-file tests (lintText) CANNOT exercise typed rules — the harness in `recommended.test.ts` disables them; typed behavior is proven against the real fixture project in `src/configs/__tests__/__fixtures__/typed-project/` via `recommended-typed.test.ts`. Fixture files there must stay clean under BOTH the repo tsconfig (strict, NodeNext) and the fixture's own tsconfig.
- TypeScript peer ceiling is `<6.1.0` — `@typescript-eslint` does not support TS 7 yet.

## Commands

- Install: `bun install`
- Build: `bun run build` (tsdown → `dist/*.mjs`; package.json points at `.mjs` outputs)
- Test: `bun run test` (vitest; rule tests via ESLint `RuleTester`, config tests via a real `ESLint` instance)
- Typecheck: `bun run typecheck`
- Full gate: `bun run validate`

## Fallow

- Use `fallow audit --format json --quiet` before committing AI-generated changes.
- Use `fallow dead-code --format json --quiet`, `fallow dupes --format json --quiet`, and `fallow health --format json --quiet` for targeted checks.
- Use `fallow list --entry-points --format json --quiet` and `fallow list --boundaries --format json --quiet` to inspect project shape.

<!-- generated:task-matrix:start -->
| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- generated:task-matrix:end -->

## Agent Rules

- Do not edit: `dist/**` (build output), `src/rules/__tests__/__fixtures__/**` semantics (fixtures encode rule contracts — changing them changes what a test proves).
- Always ask before: adding a new dependency, changing the TypeScript peer range, publishing.
- Preferred style: STRICT TDD — every rule/feature starts with a RED test; a rule without a failing test proving it fires is a disabled rule. Conventional commits, no AI attribution. The lefthook pre-commit gate (fallow audit + typecheck + test) must pass — never bypass it.
