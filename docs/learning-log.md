# Learning Log

Significant findings, gotchas, and non-obvious behaviors encountered during development. Each entry is reverse-chronological.

---

## 2026-07-27 — Stryker Mutator POC (autoreas-bridge frontend)

**Context:** POC of mutation testing with `@stryker-mutator/vitest-runner` on a React + Vitest 4.x + Wails v2 + Bun project, as groundwork for a `dlinter init --test-mutator` harness.

### Extended benchmark (3 sampling scopes)

| Sample | Area | Files | Mutants | Baseline | Optimized | Speedup |
|--------|------|-------|---------|----------|-----------|---------|
| A | `shared/ui` (components) | 23 | 556 | 547s (9.1m) | **23s** | **23.8x** |
| B | `infrastructure/` (bindings) | 43 | 1,948 | ~57 min* | **10m 53s** | **~5.2x** |
| C | `shared/helpers+constants+contracts` (pure logic) | 75 | 238 | — | **2m 31s** | — |

\* Baseline B had 222 static mutants (11%) consuming ~98% of time — `ignoreStatic` skips them entirely.

**Full project projection:** ~45–60 min optimized vs ~15h baseline.

### Findings

- **Static mutants are concentrated in infrastructure code.** Event bindings, runtime subscriptions — those patterns produce static mutants. React components and pure TS helpers have zero static mutants. `ignoreStatic: true` is safe as a default.

- **Concurrency 4 is safe on Windows when the dep optimizer is disabled.** The EPERM race was caused by workers stepping on each other's Vite cache — `deps.optimizer.client.enabled: false` eliminates that entirely. All speedup gains in Sample A came from concurrency alone.

- **Vitest multi-project `include`/`exclude` root-level leak:** Setting `include`/`exclude` at the root `vitest.config.ts` (even with `workspace` pointing to child projects) causes those patterns to leak into every child project. If patterns match files outside a child's target env, tests run in the wrong environment (e.g. `document not defined` when React tests run under `node`). **Fix:** keep root-level patterns empty and scope all patterns per-project only.

- **Vite dep optimizer EPERM race on Windows:** With multiple Stryker workers, concurrent Vite dep optimizer processes race on `node_modules/.vite/deps/` temp file renames, throwing `EPERM: operation not permitted, rename`. **Fix:** `deps.optimizer.{client,ssr}.enabled: false` in the Vitest config + Stryker `concurrency: 4`.

- **`scripts/__tests__/` references repo-root paths:** Tests in `scripts/` directories often read paths like `../../openspec/` or `../../ARCHITECTURE.md` that don't exist inside the Stryker sandbox copy. **Fix:** exclude those test files from the Vitest config mutation testing uses.

- **`--inPlace` creates backup dirs that break path-dependent tests:** Stryker's `--inPlace` mode creates `.stryker-tmp/backup-XXXX/` copies of mutated files. Tests reading `package.json` via `../../package.json` resolve to the backup dir, not the real sandbox root. **Don't use `--inPlace`** unless no tests depend on relative repo-root paths.

- **`packageManager` option only supports `npm` and `yarn`:** Stryker's `packageManager` config does not list Bun, but `packageManager: "npm"` with `"bun run"` as the command still works — Stryker only uses the package manager for its own install, and the test command runs in the shell.

- **Lefthook staged-file expansion can require `sh` on Windows:** Lefthook v2.1.4 attempted to invoke an unavailable `sh` for piped groups and staged-file template expansion. **Fix:** use a standalone job and let the Node guard read `git diff --cached` directly.

- **The staged-range guard blocks in practice:** A real staged change produced one equivalent survivor, scored 98%, and exited 1 after 1m 26s. After an exact documented suppression, the same Lefthook job reached 100% and passed in 36.69s.

### Stats (autoreas-bridge, dry run)

| Metric | Value |
|--------|-------|
| Tests | 1,304 passing (29s) |
| Mutants | 9,753 |
| Source files | 380 |
| Static mutants | 754 (8%) |
| Estimated time | ~15h at concurrency 2, ~45–60m optimized |

### Recommendations for dlinter-ts-react harness

- `ignoreStatic: true` by default — static mutants are expensive and concentrated in infra code
- `concurrency: 4` minimum on all platforms (safe with optimizer disabled)
- Use the incremental report only as a local performance cache; cache failure must fall back to a complete staged-range run
- Require a 100% mutation score for staged line ranges
- TDD workflow: make focused mutation testing an automatic pre-commit job selected from staged production files
- Reject partial staging because Stryker evaluates working-tree content, not the Git index snapshot
- Derive exact Stryker mutation ranges from `git diff --cached --unified=0`
- Both incremental reuse and staged-range Lefthook enforcement are proven; `dlinter init --test-mutator` now scaffolds the Vitest guard and its artifact hygiene
- Exclude test infrastructure (e2e, scripts tests) from Vitest config programmatically
- Generate `stryker.dlinter.json`, `vitest.dlinter-mutation.mts`, and the staged guard via the scaffolder; its package E2E verifies the published artifact
