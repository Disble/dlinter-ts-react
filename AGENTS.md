# AGENTS.md

This file gives coding agents project-specific context. Keep it short and update it when workflows change.

## Project Overview

- Primary app or package: `dlinter-ts-react` — an npm package shipping deterministic architecture governance for TS + React projects: custom ESLint rules, architecture-concept presets, and a CLI that scaffolds the pre-commit gate.
- Main entry points: `src/index.ts` (plugin + configs + `createRecommendedConfig`), `src/cli/index.ts` (`dlinter` bin).
- Important directories: `src/rules/` (one file per rule + `__tests__/`), `src/configs/` (preset factories), `src/cli/` (scaffolder).

## Architecture Notes

- Module boundaries: `src/plugin.ts` holds the shared plugin core; config factories receive it as a parameter — never import `src/index.ts` from a config (module cycle).
- Rules are plain `Rule.RuleModule` objects; esquery selector strings are used directly as visitor keys.
- Presets are named after architecture CONCEPTS (`dumb-ui`, `recommended`), never after consuming projects. Project specifics (e.g. Wails) are rule OPTIONS.
- Don't reinvent the wheel: before writing a custom rule, survey existing ESLint plugins (see README design table). Custom rules exist only for contracts no plugin ships.
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
