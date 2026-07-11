---
name: preset-testing
description: "Trigger: test the preset, config test, typed rules test, virtual file lint, pack e2e, fixture project. Pick the right harness and avoid its known traps."
license: MIT
metadata:
  author: disble
  version: "1.0"
---

## Activation Contract

Use when writing or debugging tests for presets, severities, or rules in this repo.

## Hard Rules

- Pick the harness by what you must PROVE: RuleTester = AST logic; virtual-file harness (`recommended.test.ts`) = glob wiring + severity policy; typed fixture project (`recommended-typed.test.ts`) = type-checked rules; self-governance = the repo obeys itself; `scripts/pack-e2e.mjs` = the shipped tarball.
- Virtual files (lintText) CANNOT exercise type-checked rules — no TypeScript program includes in-memory files. Always append `virtualHarnessOverrides` to virtual-harness configs; prove typed behavior only in the fixture project.
- Typed fixture files must be clean under BOTH the repo tsconfig (strict, NodeNext) and the fixture tsconfig: violate a LINT rule, never fail tsc. Keep them self-contained (no cross-imports).
- `npm pack` does NOT run prepublishOnly: always `bun run build` before `node scripts/pack-e2e.mjs`, or you validate a stale dist.
- Vitest discovers only `src/**/__tests__/**/*.test.ts` — a test file elsewhere silently never runs.
- Fixtures under `src/rules/__tests__/__fixtures__/` encode rule contracts — do not change their semantics.
- Virtual test-file fixtures need a real describe/it: `sonarjs/no-empty-test-file` runs in tests by design.

## Decision Gates

| Symptom | Cause |
|---------|-------|
| Typed rule never fires in a test | Virtual harness — move the proof to the typed fixture project |
| "No test files found" | File outside the vitest include glob |
| Parse error mentioning project service | File not covered by a tsconfig; check `include` |
| e2e green but change absent | Stale dist — rebuild first |

## Execution Steps

1. Choose the harness from the router in `docs/testing.md`.
2. Assert on rule IDs BY SEVERITY (`severity === 2` vs `1`), not counts alone.
3. RED before GREEN — run the failing state and see it fail.
4. Finish with `bun run validate`; for consumer-surface changes also `bun run build && bun run e2e:pack`.

## Output Contract

Report: harness used, what the test proves, RED evidence, validate (and e2e when relevant) results.

## References

- `docs/testing.md` — harness table, constraints, commands.
