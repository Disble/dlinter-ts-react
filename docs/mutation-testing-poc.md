# Mutation Testing POC — Stryker Mutator + Vitest

Date: 2026-07-27
Context: POC for adding a test mutator to `dlinter-ts-react` (ESLint plugin harness).
Target: `autoreas-bridge/frontend` — React + Vitest 4.x + Wails v2.

---

## Configuration

Two files created:

### `frontend/stryker.config.json`

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "concurrency": 2,
  "vitest": {
    "configFile": "vitest.stryker.mts"
  }
}
```

### `frontend/vitest.stryker.mts`

Extends the project's `vite.config.ts` test config with:

- **Excludes `scripts/__tests__/`** — those tests read `openspec/` and `ARCHITECTURE.md` from repo-root paths that don't resolve in the Stryker sandbox.
- **Disables Vite dep optimizer** (`deps.optimizer.client.enabled: false`) — prevents EPERM rename race between multiple workers on Windows.
- **No root-level `include`/`exclude`** — setting them leaks into the `node` project, causing all tests to run in node environment (`document is not defined`). Keeps Vitest's default plus project-level patterns only.

### `frontend/package.json` script

```json
"test:mutation": "stryker run"
```

---

## Issues & Fixes

### 1. Sandbox path resolution

Tests under `scripts/__tests__/` resolve repo-root paths via `path.resolve(testFilePath, '..', '..', '..')` then read `openspec/` and `ARCHITECTURE.md`. Stryker's sandbox is a copy of `frontend/`, so `..` goes to `.stryker-tmp/` — the parent repo doesn't exist.

**Fix**: Exclude `**/scripts/**` from the vitest config used during mutation runs.

### 2. `--inPlace` introduces backup path issues

Using `--inPlace` (to run in the real directory instead of a sandbox) caused Stryker to back up files to `.stryker-tmp/backup-XXXX/`. Tests reading `package.json` found the backup copy, not the real one.

**Fix**: Don't use `--inPlace`. Use sandbox mode with a proper vitest config that excludes external-path-dependent tests.

### 3. Vitest multi-project config

The project uses Vitest 4.x `projects` with two sub-projects (`node` + `dom`). The vitest-runner correctly handles sub-projects when the vitest config excludes `scripts/__tests__/` at the project level.

**Critical**: Do NOT set `include` or `exclude` at the root `test` level when using `projects` — root patterns leak into every project. Set them per-project only.

### 4. Windows EPERM — Vite dep optimizer

Stryker spawns workers (default: CPU count - 1, here 19). Each worker starts a Vitest instance that pre-bundles dependencies via Vite's dep optimizer. Multiple workers writing to the same Vite cache (`node_modules/.vite/`) causes `EPERM: rename` on Windows.

**Fix**: `deps.optimizer.client.enabled: false` in the vitest config + `concurrency: 2` in Stryker.

Even with the optimizer disabled, concurrency >4 may still hit file-locking on Windows due to SQLite temp files or other per-worker resources.

### 5. Package manager

Stryker's `packageManager` config only supports `npm` and `yarn`. Bun works for installation (`bun add --dev`) and execution (`bun run test:mutation`) but Stryker's internal plugin resolution follows npm/yarn conventions.

**Fix**: Explicitly list plugins in `stryker.config.json` (already done).

---

## Results

| Metric                        | Value                      |
|-------------------------------|----------------------------|
| Source files mutated          | 380                        |
| Total mutants generated       | 9,753                      |
| Static mutants (warned)       | 754 (8%, but ~80% of time) |
| Dry run (baseline)            | 1,304 tests, 29s           |
| Concurrency                   | 2 (POC) / 4 (benchmark)    |
| Est. full run time (baseline) | ~15 hours at concurrency 2 |
| Est. full run time (opt.)     | **~45–60 minutes**         |

### Extended benchmark (3 samples)

| Sample | Area | Files | Mutants | Baseline | Optimized | Speedup |
|--------|------|-------|---------|----------|-----------|---------|
| A | `shared/ui` (components) | 23 | 556 | 547s (9.1m) | **23s** | **23.8x** |
| B | `infrastructure/` (bindings) | 43 | 1,948 | ~57 min* | **10m 53s** | **~5.2x** |
| C | `shared/helpers+constants+contracts` (pure logic) | 75 | 238 | — | **2m 31s** | — |

\* Baseline `infrastructure/` had 222 static mutants (11%) consuming ~98% of that time — `ignoreStatic: true` skips them entirely.

**Full project projection:** ~45–60 minutes optimized (vs ~15h baseline).

### Key insight: static mutant distribution

Static mutants only appeared in infrastructure code (event bindings, Wails runtime — 11% of its mutants). React components and pure TS helpers had none. `ignoreStatic: true` is safe as a default — it only skips mutants that statically produce the same value regardless of mutation.

---

## Shipped dlinter-ts-react harness

`dlinter init --test-mutator` now generates a Vitest-only staged-line mutation guard. It validates that the resolved surface declares `vitest`, installs the exact Stryker pair, and rejects capability-file, script, or foreign Lefthook-job conflicts before it writes generated artifacts.

### Scaffolded files

1. **`stryker.dlinter.json`**:

   ```json
   {
     "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
     "testRunner": "vitest",
     "plugins": ["@stryker-mutator/vitest-runner"],
     "concurrency": 4,
     "ignoreStatic": true,
     "vitest": {
       "configFile": "vitest.stryker.mts"
     }
   }
   ```

2. **`vitest.dlinter-mutation.mts`** — isolated mutation config:
   - Exclude `**/scripts/**` tests
   - Exclude `**/.stryker-tmp/**`
   - Disable dep optimizer
   - Remove any root-level `include`/`exclude`

3. **Generated guard and script**:
   ```json
    "test:mutation:staged": "node ./scripts/dlinter-mutation-staged.mjs"
   ```

The generated `scripts/dlinter-mutation-staged.mjs` stores incremental state in Git metadata, isolates sandboxes in `.dlinter-mutation-tmp/`, and additively records that temporary directory in the selected surface's `.gitignore`. It does not generate reports, use `--inPlace`, or broadly ignore Stryker configuration files.

### Local pre-commit integration

- Add an automatic mutation job to the local pre-commit hook. A manual checkpoint cannot enforce the workflow for developers or subagents.
- Let the guard script select staged files itself. This keeps the job portable on Windows, where Lefthook v2.1.4 can invoke an unavailable `sh` when expanding staged-file templates or piped groups.
- Convert the zero-context staged diff (`git diff --cached --unified=0`) into Stryker mutation ranges such as `src/example.ts:18-31`. Stryker then mutates only added or modified lines.
- Reject partial staging when a staged source file also has unstaged changes; Stryker evaluates working-tree content, so allowing this would test different code from the commit.
- Require a 100% mutation score inside those ranges. Any surviving or uncovered mutable line blocks the commit.
- Treat the incremental report only as a performance cache. A missing or corrupt cache triggers a non-incremental run over the same staged ranges; it never skips verification.

### Automatic TDD checkpoint before commit

Mutation testing belongs in the enforced local workflow:

```
RED       write a failing behavior test
GREEN     implement the smallest change
COMMIT    pre-commit automatically runs the focused mutation guard
```

Lefthook runs one standalone job; the script selects staged production files and exits immediately when none match:

```yaml
pre-commit:
  jobs:
    - name: mutation
      run: bun --cwd="frontend" run test:mutation:staged
```

`test:mutation:staged` must be a guard script rather than a direct Stryker alias. The script validates staged/worktree consistency, derives mutation ranges from the staged diff, passes the comma-separated ranges to Stryker's `--mutate` option, and exits non-zero unless all generated mutants are killed. Lefthook then blocks the commit.

The local cache lives outside the staged source set and only reduces runtime. Equivalent mutants require an explicit Stryker disable comment with a reason, making every exception visible in code review.

### Proven local enforcement

The POC proves that Stryker can reuse unchanged mutant results: the real history change reused 236 of 255 results in 11 seconds, and a no-change rerun reused all 255 in 3 seconds.

The local guard was also exercised through the real Lefthook pre-commit job:

- Six focused guard tests prove range conversion, deletion-only handling, partial-staging rejection, no-source skipping, and Stryker exit-code propagation.
- The first real run generated 50 mutants in the staged ranges. One equivalent mutant survived, producing a **98% score** and exit code 1 after **1m 26s**. The commit was blocked.
- A precise Stryker suppression documented why that mutation was equivalent. The next run killed all 48 generated mutants, reached **100%**, and passed in **36s**.
- The end-to-end Lefthook run reused 48 of 50 cached results, reached **100%**, and completed in **36.69s**.
- The real Git index was restored to its original empty state after the integration test.

The measured single-change runtime is acceptable for a local correctness gate. Runtime across several staged source files still needs measurement before choosing a default maximum scope for the generated harness.

### Platform-aware concurrency

Benchmark confirmed `concurrency: 4` on Windows is safe when the dep optimizer is disabled. Push further (6-8) on macOS/Linux; stay at 4 on Windows unless file-locking surfaces.

## Local workflow placement

Mutation testing is a focused quality gate in the existing pre-commit workflow:

```
pre-commit (lefthook)
  ├── fallow audit      ← fast (<5s)
  ├── typecheck         ← fast (<10s)
  ├── test              ← fast (<30s)
  └── mutation:staged   ← only mutable staged-line ranges
```

| Stage | Include mutation? | Why |
|-------|-------------------|-----|
| **automatic pre-commit** | Yes, staged line ranges | Runs only when production source lines are staged and blocks the commit unless their mutants are killed. |
| **ordinary RED/GREEN loop** | No | Keeps feedback immediate while the implementation is still changing. |

### Guardrails

- **100% for staged ranges** — every generated mutant in new or modified lines must be killed.
- **Explicit equivalent-mutant suppression** — disable only the exact mutation with a reason in source.
- **Incremental cache is optional** — cache failure falls back to a complete run over the staged ranges.
- **Partial staging is rejected** — the hook verifies the same source content Git will commit.
- **Hook tests are mandatory** — test the guard in temporary Git repositories, including its failure paths.

## Real incremental validation

The incremental workflow was validated against a real change in
`autoreas-bridge/frontend`, not only through a dry run:

**Change under test:** `src/features/history/ui/HistoryTable/history-table.helpers.ts`

- The formatter changed from unlimited day labels such as `3134 days ago` to completed months and years, including `1 month`, `1 year`, and `8 years 6 months`.
- Focused behavior tests covered day, month, incomplete-calendar-month, singular, plural, and multi-year boundaries.
- The pre-change baseline contained **206 mutants** and took **79 seconds**.
- After the source and test changes, Stryker detected one changed source file and reused **236 of 255** existing mutant results. It reran 19 mutants in **11 seconds**.
- The incremental run produced a **90.59% mutation score** with 231 killed, 21 survived, and 3 without coverage. The surviving results belonged to existing helper logic or an equivalent branch mutation.
- A subsequent run with no changes reused **255 of 255** results and completed in **3 seconds**.

This proves Stryker's incremental result reuse. The staged-range guard was then productized as `dlinter init --test-mutator`, with unit coverage and a packed-tarball smoke test that verifies generated files, the package script, `.gitignore`, and installed exact dependencies.

### Known constraints

- TypeScript 6.x is supported via the default mutate patterns (include `.ts`, `.tsx`).
- Vitest `projects` (multi-project) requires the config file override approach.
- Tests that read external files (repo-root docs, OpenSpec artifacts, etc.) must be excluded.
- `@stryker-mutator/vitest-runner@9.x` requires Node >=22 and Vitest >=2.0.0.
- Bun is supported as an install/run tool but not as Stryker's `packageManager` (use npm/yarn for that setting, or omit it).

---

## Files changed in autoreas-bridge

- `frontend/package.json` — added `test:mutation` script
- `frontend/stryker.config.json` — created
- `frontend/vitest.stryker.mts` — created
- `frontend/package.json` — added `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` dev deps
- `frontend/scripts/mutation-staged.mjs` — staged-range guard
- `frontend/scripts/__tests__/mutation-staged.node-test.mjs` — focused guard tests
- `frontend/stryker.staged.json` — 100% staged-range configuration
- `frontend/vite.config.ts` — excludes the staged guard sandbox
- `lefthook.yml` — runs the local mutation guard before commit

All are candidates for cleanup once the POC is complete (they are POC artifacts, not production code).
