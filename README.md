# dlinter-ts-react

[![CI](https://github.com/Disble/dlinter-ts-react/actions/workflows/ci.yml/badge.svg)](https://github.com/Disble/dlinter-ts-react/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dlinter-ts-react)](https://www.npmjs.com/package/dlinter-ts-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Deterministic architecture governance for TypeScript + React projects.** One install brings first-class ESLint rules that enforce your architecture — Dumb UI, strict colocation, hook anatomy, layer boundaries — plus the entire third-party plugin stack, pre-composed, and a CLI that scaffolds your pre-commit gate.

Architecture documents don't stop violations; linters do. This package turns architectural constraints that usually live as prose (and get silently violated by humans and AI agents alike) into build-time guarantees.

```bash
npm install -D dlinter-ts-react eslint lefthook
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

That's it. No plugin shopping: `import-x`, `jsdoc`, `sonarjs`, `check-file`, `react`, `react-hooks`, `react-doctor`, and `@typescript-eslint` ship as dependencies of this package, already composed and scoped.

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

Presets are named after **architecture concepts** (`recommended`, `dumb-ui`), never after projects. Your project's specifics are options, not preset names.

## What else is in `recommended`

Beyond the `dlinter/` rules, the preset composes the bundled ecosystem with proven settings:

- **`tsc` owns `no-undef`** — ESLint's version only false-positives on TS globals. Keep a typecheck job in your gate; it is load-bearing.
- **`import-x`**: cycle detection (`no-cycle`), duplicate imports, TypeScript-aware resolution.
- **`jsdoc/require-jsdoc`** on every exported function, interface, and type alias.
- **`check-file`**: tests belong in `__tests__/`, feature folders are kebab-case, `utils.ts` is banned (name the role: `*.helpers.ts`).
- **`sonarjs` + `react-doctor` as warnings** — advisory signal, never gate failures.
- **`max-lines`**: 500 effective lines, hard error.
- **`react-hooks`**: `rules-of-hooks` stays an error; nothing else replaces that safety net.

## CLI

```bash
npx dlinter init
```

Scaffolds `lefthook.yml` with a lint + typecheck + test pre-commit gate. Never overwrites an existing file — a hand-tuned gate always wins over the template.

## Compatibility

| Peer | Range |
|------|-------|
| `eslint` | `>=9` (ESLint 10 supported) |
| `typescript` | `>=5.0.0 <6.1.0` — TypeScript 7 (native) is not yet supported by `@typescript-eslint`; the ceiling moves when the ecosystem does |
| `node` | `>=20.19.0` |

## Design principles

| Principle | In practice |
|-----------|-------------|
| First-class rules, never selector catalogs | `no-restricted-syntax` is a single rule slot consumers can silently override; every constraint here has its own rule ID, its own docs, and per-rule disable |
| Don't reinvent the wheel | Existing plugins are bundled wheels (`max-lines`, `check-file`, `import-x`, …). Custom rules exist only for contracts no plugin ships — e.g. conditional folder ownership, pure-barrel enforcement |
| Tests are the proof | Every rule is TDD-built with RED/GREEN `RuleTester` cases; presets are tested through a real `ESLint` instance; releases are gated by installing the actual tarball into a fresh consumer project |
| Validated against production | The full preset reproduces the source system's lint verdicts at exact file:line parity (30/30) on the codebase it was extracted from |

## Development

```bash
bun install
bun run test        # vitest: RuleTester per rule + ESLint-instance integration harness
bun run typecheck   # tsc --noEmit
bun run build       # tsdown → dist/*.mjs
bun run e2e:pack    # pack the tarball, install it into a fresh consumer, verify plugin + preset + CLI
bun run validate    # typecheck + test
```

The repo self-hosts its own gate (lefthook: fallow audit + typecheck + test). Contributions follow strict TDD — a rule without a failing test proving it fires is a disabled rule — and conventional commits.

### Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please): conventional commits on `main` drive the next semver (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major). The bot maintains a Release PR with the computed version and CHANGELOG; **merging that PR** cuts the GitHub release and publishes to npm with provenance — after the tarball end-to-end gate passes.

Manual escape hatch: pushing a `v*` tag triggers the same publish pipeline directly.

Requires the `NPM_TOKEN` secret in the repository settings.

## Roadmap

- File-size advisory (400-line warning tier ahead of the 500 hard limit)
- `dlinter init`: prettier scaffold + package-manager detection (bun/pnpm/npm)
- Layer/boundary preset built on `eslint-plugin-boundaries`

## License

[MIT](./LICENSE) © Disble
