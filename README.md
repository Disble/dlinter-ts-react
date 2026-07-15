# dlinter-ts-react

[![CI](https://github.com/Disble/dlinter-ts-react/actions/workflows/ci.yml/badge.svg)](https://github.com/Disble/dlinter-ts-react/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dlinter-ts-react)](https://www.npmjs.com/package/dlinter-ts-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Deterministic architecture governance for TypeScript + React projects.** One install brings first-class ESLint rules that enforce your architecture — Dumb UI, strict colocation, hook anatomy, layer boundaries — plus the entire third-party plugin stack, pre-composed, and a CLI that scaffolds your pre-commit gate.

Architecture documents don't stop violations; linters do. This package turns architectural constraints that usually live as prose (and get silently violated by humans and AI agents alike) into build-time guarantees.

```bash
npm install -D dlinter-ts-react eslint lefthook fallow
```

```js
// eslint.config.js
import dlinter from 'dlinter-ts-react';

export default [...dlinter.configs.recommended];
```

```bash
npx dlinter init      # scaffolds the lefthook pre-commit gate
npx lefthook install
```

That's it. The install line's `eslint`, `lefthook`, and `fallow` are the three external tools the scaffolded gate drives — the linter, the git-hook runner, and the architecture audit (`dlinter init` writes a `fallow` job and a `.fallowrc.json`, so `fallow` must be present for the gate to run). Everything else is bundled: `import-x`, `jsdoc`, `sonarjs`, `check-file`, `react`, `react-hooks`, `react-doctor`, and `@typescript-eslint` ship as dependencies of this package, already composed and scoped.

## The architecture it enforces

Every file in `src/` has one role, and every role has a contract:

| File | Role | Contract |
|------|------|----------|
| `*.tsx` | Presentational view | No `useEffect`, no runtime/infrastructure access, `Readonly<Props>` boundaries |
| `use-*.ts` | Colocated hook | Owns side effects; anatomy: `useMemo` → `useCallback` → `useEffect` → `return` |
| `*.types.ts` | Type contract | Interfaces and type aliases; `*Props` fields are `readonly` |
| `*.helpers.ts` | Helpers | Functions only — no inline type declarations |
| `*.constants.ts` / `*.schema.ts` | Constants / Zod schemas | The only home for root-level constants and `zod` imports |
| `index.ts` | Barrel entrypoint | Pure re-exports only — no logic, no side effects |
| `App.tsx`, `src/app/**` | Delivery layer | Composition only: no React hooks, no custom hook imports |
| `__tests__/**` | Tests | Exempt from all architecture rules — tests describe behavior, not shape |

When a module splits into role files, the whole unit moves into a folder named after the module with a pure `index.ts` entrypoint — enforced by reading the real filesystem, not by convention.

## Rules

All rules ship under the `dlinter/` namespace and are individually configurable:

| Rule | Enforces |
|------|----------|
| `dlinter/no-view-effects` | Views never call `useEffect`/`useLayoutEffect` (including `React.*` forms) |
| `dlinter/strict-colocation` | Declarations live in their role file; main modules export named functions. `checks` option narrows enforcement per file role |
| `dlinter/hook-anatomy` | Derived state before callbacks before effects; hooks end with `return` |
| `dlinter/readonly-props` | `Readonly<Props>` at function boundaries; `readonly` fields in Props interfaces |
| `dlinter/no-infrastructure-in-view` | Views never touch the infrastructure edge — **you** define the edge (see below) |
| `dlinter/composition-only-delivery` | Delivery files compose feature entrypoints; they never orchestrate |
| `dlinter/pure-index-barrel` | `index.ts` contains re-export statements only |
| `dlinter/folder-ownership` | Modules with role-file siblings are folder-owned with an `index.ts` entrypoint |
| `dlinter/require-exported-variable-jsdoc` | Every exported variable carries a JSDoc block |
| `dlinter/no-partial-package-mock` | *(opt-in, see below)* `vi.mock`/`vi.doMock`/`vi.importActual` never partially replace a bare package specifier through a referenced factory parameter |
| `dlinter/no-test-timeout-overrides` | *(opt-in, see below)* No per-test/hook timeout overrides in test files; config files may only lower `testTimeout`/`hookTimeout` below the Vitest default |
| `dlinter/require-spy-restore` | *(opt-in, see below)* Every `vi.spyOn` call is satisfied by an ancestor-scoped `afterEach(() => vi.restoreAllMocks())` |

## Configuring your infrastructure edge

The boundary concept is universal; the edge is yours. Wails, tRPC clients, generated API bindings — pass them as options:

```js
import { createRecommendedConfig } from 'dlinter-ts-react';

export default createRecommendedConfig({
  infrastructure: {
    importPatterns: ['(^|/)wailsjs(/|$)'],   // regex sources matched against import specifiers
    runtimeGlobals: ['window.go'],           // object.property member paths
  },
});
```

| Option | Default | Purpose |
|--------|---------|---------|
| `infrastructure` | `undefined` (rule off) | Import patterns + runtime globals that views must never touch directly |
| `deliveryGlobs` | `['src/App.tsx', 'src/app/**/*.{ts,tsx}']` | Which files form the composition-only delivery layer |
| `tsconfigPath` | `./tsconfig.json` | tsconfig used by the import resolver |
| `reactCompiler` | `false` | Project compiles with React Compiler → `react-doctor/react-compiler-no-manual-memoization` activates at its upstream severity (manual memoization becomes redundant noise). Without the compiler it stays off — manual memoization is load-bearing |
| `vitestHygiene` | `false` | Activates the Vitest testing-hygiene rule block (see below) |

Presets are named after **architecture concepts** (`recommended`, `dumb-ui`), never after projects. Your project's specifics are options, not preset names.

## Testing hygiene (opt-in)

`vitestHygiene: true` activates three rules that — deliberately — apply to
your test files, an exception to the rule that architecture rules stay off
tests:

```js
export default createRecommendedConfig({ vitestHygiene: true });
```

- **`dlinter/no-partial-package-mock`** — a `vi.mock`/`vi.doMock` factory
  that reads the real module through its first parameter on a bare package
  specifier couples the test to Vitest's module-loader internals and breaks
  under `deps.optimizer`; `vi.importActual` on a bare specifier reproduces
  the identical bug. Use a namespace spy (`import * as pkg from 'pkg'; vi.spyOn(pkg, 'name')`)
  for non-optimized packages, or a full replacement factory for optimized
  ones.
- **`dlinter/no-test-timeout-overrides`** — the default timeout budget is a
  regression detector; raising it papers over a performance bug instead of
  fixing it. Banned in test files (positional, options-object, hook, and
  `vi.setConfig` overrides); in Vitest config files (`vite.config.*`,
  `vitest.config.*`, `vitest.workspace.*`) only *raising* `testTimeout`
  above 5000ms or `hookTimeout` above 10000ms is flagged — lowering stays
  legal.
- **`dlinter/require-spy-restore`** — every `vi.spyOn` call must be
  satisfied by an `afterEach(() => vi.restoreAllMocks())` registered at its
  own or an ancestor `describe` scope; a per-spy `.mockRestore()` does not
  satisfy the contract. If your Vitest config already sets
  `restoreMocks: true` globally, pass `{ assumeGlobalRestore: true }` as the
  rule's option instead of adding `afterEach` blocks everywhere — the rule
  cannot read your resolved Vitest config, so this is your own declaration.

These rules exist because of a real incident: a partial package mock broke
silently under Vitest's dependency optimizer (see the rule's JSDoc for the
first-party repro). Default is `false` — zero behavior change for existing
consumers until they opt in.

## What else is in `recommended`

Beyond the `dlinter/` rules, the preset composes the bundled ecosystem with proven settings:

- **`tsc` owns `no-undef`** — ESLint's version only false-positives on TS globals. Keep a typecheck job in your gate; it is load-bearing.
- **`import-x`**: cycle detection (`no-cycle`), duplicate imports, TypeScript-aware resolution.
- **`jsdoc/require-jsdoc`** on every exported function, interface, and type alias.
- **`check-file`**: tests belong in `__tests__/`, feature folders are kebab-case, `utils.ts` is banned (name the role: `*.helpers.ts`).
- **`max-lines`**: 500 effective lines, hard error.
- **`react-hooks`**: `rules-of-hooks` blocks (zero false positives; violations corrupt React's hook order at runtime). `exhaustive-deps` is deliberately advisory — its documented false-positive patterns would force worse code or disable-comments at `error`.

### Upstream severities are respected, never blanket-downgraded

Every bundled plugin whose recommended config the preset spreads keeps **its own author's per-rule triage** — that triage is exactly the work this package does for you, and sweeping a whole ruleset to `warn` would throw it away. Only *named* rules are re-tuned, each with a documented reason in the source:

- **`@typescript-eslint`** — the recommended tier (20 definite-bug rules at `error`: `no-explicit-any`, `no-misused-new`, `no-unsafe-function-type`, …) applies to all TypeScript. The **type-checked tier** (`no-floating-promises`, `no-misused-promises`, `await-thenable`, the `no-unsafe-*` family) runs on production `src/**` through the TypeScript project service — **your tsconfig must cover `src/`**. Tests are exempt (mock-assertion patterns are documented `unbound-method` misfires).
- **`sonarjs`** — upstream ships 206 bug and security rules at `error` and they block as-is, including `cognitive-complexity`, `no-identical-functions`, and `no-nested-conditional` (kept at `error` so the ESLint gate and a Fallow audit agree on one standard) and `prefer-read-only-props` (kept for SonarQube Cloud parity — it coexists with `dlinter/readonly-props`, which additionally governs `*.types.ts` contracts and needs no type information). Surgical exceptions, each with a reason: `todo-tag`/`fixme-tag` warn instead of blocking tracked work, `pseudo-random` warns (Math.random is legitimate for non-crypto frontend uses), `no-unused-vars` is off because `@typescript-eslint` owns that contract with the underscore convention. In test files only the fake-credential rules go quiet — mirroring SonarQube Cloud's reduced test-file profile — while `no-exclusive-tests` keeps guarding your suite.
- **`react-doctor`** — 34 upstream `error` rules block (definite bugs and a11y: `jsx-key`, `no-direct-mutation-state`, `require-render-return`, `alt-text`, the `aria-*` set…); ~198 heuristics stay warnings. Sole override: `react-compiler-no-manual-memoization` is off by default and returns at upstream severity via `createRecommendedConfig({ reactCompiler: true })`.

Each spread plugin is **pinned to an exact version**, and a drift test locks its upstream error-set (`src/configs/__tests__/upstream-severity-contracts/`) — a bump that changes the set fails CI and forces a deliberate re-triage, never silent drift.

## CLI

```bash
npx dlinter init [--profile <id>]
```

`dlinter init` detects your project's package manager (bun/pnpm/yarn/npm, by
lockfile) and stack shape, then scaffolds a matching pre-commit gate:

- **`lefthook.yml`** — `fallow`, `lint`, `typecheck`, and `test` jobs, each
  invoking a `package.json` script through your detected package manager. An
  existing `lefthook.yml` is never overwritten wholesale — it is **additively
  merged**: dlinter-owned jobs (marked with an internal `# dlinter:owned`
  comment) are added or refreshed, and every job you already own — including
  same-named ones — is left completely untouched (a same-named job without
  the marker is reported as a conflict, not silently replaced).
- **`.fallowrc.json`** — a starter Fallow config for the detected stack.
  Create-only: an existing file is always left untouched.
- **`package.json` scripts** — any of `audit`/`lint`/`typecheck`/`test`
  missing from your manifest are added with a stack-appropriate default.
  Existing scripts are never modified, regardless of their content.
- **An ESLint config suggestion** — printed to stdout, never written to disk.

Supported stack profiles (detected in this precedence order, first match
wins): `wails-frontend` (a `frontend/` Wails consumer), `nextjs`, `react-native`,
`react-spa`, and the universal `ts-lib` fallback. Pass `--profile <id>` to
force a specific profile instead of detecting one — an unknown id is
rejected before anything is written. The command prints what it detected (or
what `--profile` forced) alongside every file/script outcome, so a
misdetection is visible rather than silent.

Note: the additive `lefthook.yml` merge is implemented with the
[`yaml`](https://www.npmjs.com/package/yaml) package, which `dlinter init`
depends on at runtime to preserve comments and hand-written jobs exactly.

## Compatibility

| Peer | Range |
|------|-------|
| `eslint` | `>=9` (ESLint 10 supported) |
| `typescript` | `>=5.0.0 <6.1.0` — TypeScript 7 (native) is not yet supported by `@typescript-eslint`; the ceiling moves when the ecosystem does |
| `node` | `>=20.19.0` |

The type-checked rule tier builds a real TypeScript program via the project service: every file under `src/` must be covered by a `tsconfig.json` (the nearest one to each file wins). A standard `"include": ["src"]` already satisfies this.

## Design principles

| Principle | In practice |
|-----------|-------------|
| First-class rules, never selector catalogs | `no-restricted-syntax` is a single rule slot consumers can silently override; every constraint here has its own rule ID, its own docs, and per-rule disable |
| Don't reinvent the wheel | Existing plugins are bundled wheels (`max-lines`, `check-file`, `import-x`, …). Custom rules exist only for contracts no plugin ships — e.g. conditional folder ownership, pure-barrel enforcement |
| Respect upstream triage, never blanket-downgrade | A bundled plugin's own per-rule severities are the plugin author's triage — honored as-is. Only specific rule IDs are re-tuned, each with a documented reason; a drift test locks the upstream error-set so a version bump forces a deliberate re-triage instead of silent drift. Bulk-demoting a whole ruleset is the exact config archaeology this package exists to spare consumers |
| Tests are the proof | Every rule is TDD-built with RED/GREEN `RuleTester` cases; presets are tested through a real `ESLint` instance; releases are gated by installing the actual tarball into a fresh consumer project |
| Validated against production | The full preset reproduces the source system's lint verdicts at exact file:line parity (30/30) on the codebase it was extracted from |

## Development

Contributor and agent documentation lives in [`docs/`](./docs/README.md) — architecture (with diagrams), the severity policy and its override ledger, the add-a-rule recipe, and the testing harnesses.

```bash
bun install
bun run test        # vitest: RuleTester per rule + ESLint-instance integration harness
bun run typecheck   # tsc --noEmit
bun run build       # tsdown → dist/*.mjs
bun run e2e:pack    # pack the tarball, install it into a fresh consumer, verify plugin + preset + CLI
bun run validate    # typecheck + test
```

The repo self-hosts its own gate (lefthook: fallow audit + typecheck + test). Contributions follow strict TDD — a rule without a failing test proving it fires is a disabled rule — and conventional commits.

### Self-governance

This package enforces its own rules on itself. A permanent test (`src/__tests__/self-governance.test.ts`, part of `bun run validate`) lints `src/**` with the universal subset of the shipped rules — strict colocation, folder ownership, pure barrels, exported-variable JSDoc, `max-lines` — plus a layer contract on import direction:

```
src/index.ts → src/configs/ → src/plugin.ts → src/rules/     (src/cli/ is a standalone bin)
```

Every commit and release must pass the same architecture this package sells. Two documented exceptions: rule modules are exported const objects (the ESLint plugin contract requires it), and the package entrypoints (`main`, `bin`) are composition modules, not barrels.

### Releasing

Code lands on `main` only through **feature-branch pull requests** — `main` is protected and rejects direct pushes, so CI and SonarCloud analyze the real diff on every change. See [docs/release-and-ci.md](./docs/release-and-ci.md) for branch protection, CI, and the CI-based Sonar setup.

Releases are automated with [release-please](https://github.com/googleapis/release-please): the conventional commits merged into `main` drive the next semver (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major). The bot maintains a Release PR with the computed version and CHANGELOG; **merging that PR** cuts the GitHub release and publishes to npm — after the tarball end-to-end gate passes.

Publishing authenticates via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC): no tokens, nothing to rotate, provenance built in. The trusted publisher is configured in the package settings on npmjs.com, bound to this repository's `release-please.yml` workflow. Emergency escape hatch: publish locally with `npm publish` (2FA OTP applies).

## Roadmap

- File-size advisory (400-line warning tier ahead of the 500 hard limit)
- Multi-surface / monorepo detection for `dlinter init` (v1 always resolves exactly one surface)
- Layer/boundary preset built on `eslint-plugin-boundaries`

## License

[MIT](./LICENSE) © Disble
