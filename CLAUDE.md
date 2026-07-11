# CLAUDE.md

Project-specific guidance for Claude Code. `AGENTS.md` is the canonical, fuller
context (architecture, commands, fallow, agent rules) — read it first. This file
highlights the non-negotiables.

## The one principle that's easy to violate

**Never blanket-downgrade a third-party plugin's ruleset.** A bundled plugin's
per-rule severities ARE the plugin author's triage — the exact "hard work" this
package exists to do for consumers. Bulk-demoting a whole ruleset to `warn`
throws that signal away and re-labels definite bugs as advisory.

The rule:

1. Spread the plugin's recommended rules **as-is** (respect upstream severity).
2. Override **only named rule IDs**, each with a documented reason — with a
   surgeon's precision, not a bulk sweep.
3. **Pin the plugin to an exact version** and **lock the upstream error-set with
   a drift test**, so a version bump that changes it fails CI and forces a
   deliberate re-triage instead of silent drift.

This policy governs EVERY plugin whose config the preset spreads — react-doctor
(34 error / ~198 warn), sonarjs (206 error / 62 off), @typescript-eslint
recommended (20 error) and type-checked-only (23 error, `src/**` via the
project service, tests exempt):
- Surgical overrides: `src/configs/recommended/recommended.constants.ts` →
  `reactDoctorSurgicalOverrides`, `sonarjsSurgicalOverrides`,
  `sonarjsTestContextOverrides` — every entry has a reason comment
- Drift guards: `src/configs/__tests__/upstream-severity-drift.test.ts` locks
  each upstream error-set against the JSON contracts in
  `src/configs/__tests__/upstream-severity-contracts/`
- Behavioral proof: `src/configs/__tests__/recommended.test.ts` (virtual files;
  typed tier disabled there by design) and `recommended-typed.test.ts` (real
  fixture project — typed rules need a TypeScript program)
- Exact pins: `package.json` → `eslint-plugin-react-doctor`,
  `eslint-plugin-sonarjs`, `@typescript-eslint/*`

If you catch yourself reaching for a helper that downgrades an entire rules map,
stop — that is the anti-pattern this project was corrected away from.

## Non-negotiables (see AGENTS.md for the rest)

- **STRICT TDD** — every rule/feature starts with a RED test. A rule without a
  failing test proving it fires is a disabled rule.
- **Self-governance** — the package lints itself (`src/__tests__/self-governance.test.ts`);
  the layer contract `src/index.ts → src/configs/ → src/plugin.ts → src/rules/`
  is enforced, not just documented. Run `bun run validate` before calling done.
- **Conventional commits, no AI attribution.** Never bypass the lefthook gate.
- **Always ask before** adding a dependency, changing the TypeScript peer range,
  or publishing.
