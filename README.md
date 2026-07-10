# dlinter-ts-react

Deterministic architecture governance for TypeScript + React projects, packaged once and installed everywhere. Instead of copy-pasting ESLint configs, scripts, and pre-commit gates between repos, this package ships them as first-class custom rules, architecture-concept presets, and a CLI that scaffolds the gate.

Extracted from the governance system proven in `autoreas-bridge/frontend`.

## Quick path

1. `npm install -D dlinter-ts-react eslint lefthook` — one install brings the full plugin stack (`import-x`, `jsdoc`, `sonarjs`, `check-file`, `react`, `react-hooks`, `react-doctor`, `@typescript-eslint`).
2. In `eslint.config.js`:

   ```js
   import { createRecommendedConfig } from 'dlinter-ts-react';

   export default createRecommendedConfig({
     // Optional: define your project's infrastructure edge.
     infrastructure: {
       importPatterns: ['(^|/)wailsjs(/|$)'],
       runtimeGlobals: ['window.go'],
     },
   });
   ```

   Or the zero-config form: `import dlinter from 'dlinter-ts-react'` and spread `dlinter.configs.recommended`.

3. `npx dlinter init` — scaffolds `lefthook.yml` (lint + typecheck + test pre-commit gate; never overwrites an existing one), then `npx lefthook install`.

> **TypeScript compatibility**: peer range is `>=5.0.0 <6.1.0`. TypeScript 7 (native) is not yet supported by `@typescript-eslint` — the ceiling moves when the ecosystem does.

## Design decisions

| Topic | Decision |
|-------|----------|
| Rules | First-class custom rules (`dlinter/*`), never `no-restricted-syntax` catalogs — consumers cannot silently override them via flat-config rule-slot collisions, and each rule is individually configurable. |
| Presets | Named after architecture concepts (`dumb-ui`, later `strict-colocation`, `hook-anatomy`, boundary presets) — never after a consuming project. Project specifics are rule OPTIONS, not preset names. |
| Structure | Single package: plugin + configs + structural checker + CLI. One install, one version. |
| Testing | TDD with vitest. Rules driven by `RuleTester`; configs driven through a real `ESLint` instance; CLI driven against temp directories. A rule without a RED test proving it fires is a disabled rule. |
| Gate | The package self-hosts its own lefthook gate (typecheck + test) — it eats its own dog food. |

## Current state

| Subsystem | Status |
|-----------|--------|
| `dlinter/no-view-effects` — Dumb UI: no `useEffect`/`useLayoutEffect` in views | ✅ shipped |
| `dlinter/strict-colocation` — declaration ownership via role files, with a `checks` option | ✅ shipped |
| `dlinter/hook-anatomy` — useMemo → useCallback → useEffect → return in `use-*.ts` | ✅ shipped |
| `dlinter/readonly-props` — `Readonly<Props>` boundaries + readonly Props fields | ✅ shipped |
| `dlinter/no-infrastructure-in-view` — configurable boundary (import patterns + runtime globals) | ✅ shipped |
| `dlinter/composition-only-delivery` — delivery layer composes, never orchestrates | ✅ shipped |
| `dlinter/require-exported-variable-jsdoc` — documentation contract for exported variables | ✅ shipped |
| `configs.recommended` / `createRecommendedConfig(options)` — full governance preset | ✅ shipped |
| `configs['dumb-ui']` preset | ✅ shipped |
| `dlinter init` (lefthook gate scaffold) | ✅ shipped |

## Roadmap

- [ ] Structural checker (`dlinter check`) — pure `index.ts` barrels, folder-owned split modules (cross-file topology ESLint cannot prove)
- [ ] File-size advisory (400 warn / 500 error) in the gate
- [ ] `dlinter init` — prettier config + package-manager detection (bun/pnpm/npm) for the lefthook template

## Development

```bash
bun install
bun run test        # vitest
bun run typecheck   # tsc --noEmit
bun run build       # tsdown → dist/
bun run validate    # typecheck + test
```

Every new rule follows the same vertical slice: RED `RuleTester` test → minimal rule → preset wiring tested through a real `ESLint` instance.
