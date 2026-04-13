# CI Workflow Examples

Copy-paste workflows for GitHub Actions. Pick the one that fits your setup.

## Basic (`github-actions-basic.yml`)

Runs `fetchtype validate` on every PR. Produces inline annotations on changed files via `--github`. No extra permissions needed.

Best for: most teams getting started.

## SARIF (`github-actions-sarif.yml`)

Same validation, but uploads results to GitHub Code Scanning (Security tab). Requires `security-events: write` permission. Free for public repos, requires GitHub Advanced Security for private repos.

Best for: teams that want validation results in the Security tab alongside CodeQL.

## Reusable Action (`github-actions-reusable.yml`)

Uses the fetchtype composite action from `fetchtype/fetchtype/.github/actions/validate`. Handles Node/pnpm setup and installation automatically. Also shows how to chain a `build` step after validation.

Best for: monorepos or teams that want a single action reference.

## Pre-commit Hook

Not CI, but worth knowing: `fetchtype check --install-hook` adds a git pre-commit hook that validates tokens before every commit. Fast path, blocks bad tokens from ever reaching CI.
