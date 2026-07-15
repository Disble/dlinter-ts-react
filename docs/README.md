# dlinter-ts-react — Developer Documentation

**What this package is**: deterministic architecture governance for TypeScript + React projects. It turns architectural constraints that usually live as prose into build-time guarantees: 9 custom ESLint rules, a pre-composed third-party plugin stack at respected upstream severities, and a CLI that scaffolds the pre-commit gate.

**Who these docs are for**: consumers defining project boundaries, plus new developers and LLM agents working on this codebase. Every doc leads with the answer, states file paths precisely, and records the invariants that are cheap to violate and expensive to rediscover.

## 60-second orientation

| Fact | Value |
|------|-------|
| Package surface | `src/index.ts` (plugin + presets + `createRecommendedConfig`), `src/cli/index.ts` (`dlinter` bin) |
| Layer contract | `src/index.ts → src/configs/ → src/plugin.ts → src/rules/` — one-way, machine-enforced |
| Dev loop | `bun install` → `bun run validate` (typecheck + all tests) |
| Release | feature branch → PR (CI + Sonar on the real diff) → merge to `main` → release-please PR → merge = npm publish (OIDC, tokenless). `main` is protected — no direct pushes |
| Methodology | **Strict TDD** — a rule without a failing test proving it fires is a disabled rule |
| Self-governance | the package lints itself with its own rules on every commit (`src/__tests__/self-governance.test.ts`) |

## Reading order by task

| You want to… | Read | Then |
|--------------|------|------|
| Understand the codebase | [architecture.md](./architecture.md) | [testing.md](./testing.md) |
| Define project-specific import or capability boundaries | [project-defined-boundaries.md](./project-defined-boundaries.md) | [architecture.md](./architecture.md) |
| Add or change an ESLint rule | [adding-a-rule.md](./adding-a-rule.md) | [testing.md](./testing.md) |
| Change any rule severity or add a plugin | [severity-policy.md](./severity-policy.md) — **read this BEFORE touching severities** | — |
| Fix a failing `upstream-severity-drift` test after a dependency bump | [severity-policy.md § Plugin bump playbook](./severity-policy.md#plugin-bump-playbook) | — |
| Write or debug tests | [testing.md](./testing.md) | — |
| Understand CI, branch protection, or the release/Sonar flow | [release-and-ci.md](./release-and-ci.md) | — |

## Non-negotiables (the short list)

- **Never blanket-downgrade a bundled plugin's ruleset.** Upstream per-rule severities are respected as-is; only named rule IDs are overridden, each with a documented reason. Full policy: [severity-policy.md](./severity-policy.md).
- **RED test first.** Every rule and feature starts with a failing test.
- **Never bypass the lefthook gate** (fallow audit + typecheck + test on every commit).
- **Conventional commits, no AI attribution.**
- **Ask before**: adding a dependency, changing the TypeScript peer range, publishing.
- **Do not edit** `dist/**` or the semantics of `src/rules/__tests__/__fixtures__/**` (fixtures encode rule contracts — changing them changes what a test proves).

## Document map

| Doc | One job |
|-----|---------|
| [architecture.md](./architecture.md) | Layers, module map, enforcement pipeline, the role-file system |
| [project-defined-boundaries.md](./project-defined-boundaries.md) | Consumer recipes for module zones, external-API ownership, and Clean/Hexagonal dependency flow |
| [severity-policy.md](./severity-policy.md) | The severity governance policy, the override ledger, drift guards, bump playbook |
| [adding-a-rule.md](./adding-a-rule.md) | The growth recipe for new rules, step by step |
| [testing.md](./testing.md) | The four test harnesses, what each can prove, and the gotchas |
| [release-and-ci.md](./release-and-ci.md) | Feature-branch + PR workflow, `main` branch protection, CI, and CI-based SonarCloud analysis |

Root-level references: [`README.md`](../README.md) (consumer-facing), [`AGENTS.md`](../AGENTS.md) (agent quick context), [`CLAUDE.md`](../CLAUDE.md) (Claude Code non-negotiables).
