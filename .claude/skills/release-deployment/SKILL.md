---
name: release-deployment
description: "Trigger: deploy release, publish npm, release-please, cut a version. Ship dlinter-ts-react through its protected PR and trusted-publishing flow."
license: MIT
metadata:
  author: "Disble"
  version: "1.0"
---

## Activation Contract

Use when preparing, deploying, publishing, or verifying a new
`dlinter-ts-react` npm release.

## Hard Rules

- Obtain explicit approval before any publish-affecting action.
- Keep `main` PR-only. Never direct-push, bypass hooks, or weaken required checks.
- Use release-please and its OIDC workflow. Do not run local `npm publish`.
- Merge only after `validate` and `SonarCloud Code Analysis` pass.
- Run `fallow audit --base origin/main --format json --quiet` before every commit.

## Decision Gates

| Condition | Action |
| --- | --- |
| Requested version already exists | Select the next release-please version; never overwrite a published version. |
| Feature branch has stale, squash-merged ancestors | Rebase only the new work unit onto `origin/main`. |
| Release PR changelog duplicates a merge-commit feature | Correct the generated release branch before merging. |
| Local npm auth is unavailable | Continue with GitHub OIDC publishing; local npm auth is unnecessary. |

## Execution Steps

1. Check clean tracked state, current version, remotes, latest GitHub release, and open PRs.
2. Run the local quality gate: `bun run validate`, `bun run build`, `bun run e2e:pack`, and the Fallow audit.
3. Commit the focused work unit, push its branch, create a PR to `main`, and wait for both required checks.
4. Merge the feature PR. Inspect the release-please PR for version, manifest, package, and changelog accuracy.
5. Wait for its checks, merge it, then watch the `Release Please` workflow through its `publish` job.
6. Verify `npm view dlinter-ts-react@<version> version dist-tags --json`, GitHub release metadata, and a synchronized local `main`.

## Output Contract

Return the version, feature and release PR URLs, release URL, required-check results, publish-workflow result, and any local artifact intentionally preserved.

## References

- `docs/release-and-ci.md` — branch protection and trusted-publishing workflow.
- `README.md` — consumer release and CLI context.
