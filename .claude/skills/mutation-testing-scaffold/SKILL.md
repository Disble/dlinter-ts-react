---
name: mutation-testing-scaffold
description: "Trigger: mutation testing, test-mutator, Stryker scaffold, dlinter mutation guard. Scaffold and verify dlinter's consumer mutation-testing guard."
license: MIT
metadata:
  author: "Disble"
  version: "1.0"
---

## Activation Contract

Use when scaffolding or validating `dlinter init --test-mutator` in a consumer
repository.

## Hard Rules

- Assess the resolved target before mutating it: require a supported package
  manager, a surface `package.json`, Vitest, and compatible source/test layout.
- Invoke the official `dlinter init --test-mutator` command. Do not manually
  recreate its generated artifacts.
- Preserve unrelated target changes. Review generated-file outcomes and leave
  existing conflicting files, scripts, and Lefthook jobs untouched.
- Run a Vitest config dry run and a Stryker dry run before any bounded mutation
  execution. Report surviving mutants as test gaps.

## Decision Gates

| Evidence | Action |
| --- | --- |
| `dlinter` is locally available | Run `dlinter init --test-mutator` from the detected target root. |
| Yarn `dlx` fails with its TypeScript compatibility patch | Record the failure and use `npx --yes dlinter-ts-react@<version> init --test-mutator`. |
| Alias resolution or non-source agent skill trees fail a generated run | Adjust Stryker or Vitest configuration only from the target config or run output, then repeat both dry runs. |
| A dry run fails | Fix the evidenced integration issue; do not start mutation execution. |

## Execution Steps

1. Inspect the target manifest, lockfile, Vitest config, source/test globs, and
   working-tree status. Confirm the generated guard targets the intended
   surface.
2. Run the official init command through the target's installed CLI or its
   package-manager executor. Inspect its created, merged, skipped, and warning
   output.
3. Run the generated Vitest config in non-watch mode, then run Stryker with
   `--dryRunOnly` and `stryker.dlinter.json`.
4. Execute only the agreed bounded mutation scope after both dry runs pass.
   Classify survivors as missing or weak tests and strengthen tests before
   changing production behavior.

## Output Contract

Return target compatibility evidence, command results, generated outcomes,
configuration adjustments with their evidence, bounded execution scope, and
survivors reported as test gaps.

## References

- `AGENTS.md` — CLI scaffolding and consumer-artifact ownership rules.
- `README.md` — package and CLI context.
