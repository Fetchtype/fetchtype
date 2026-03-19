# CI integration

fetchtype is designed to run in CI pipelines. Typography validation becomes a checked gate — not something that silently drifts.

## GitHub Actions

### Basic validation

```yaml
- name: Validate typography
  run: npx fetchtype validate -i fetchtype.tokens.json --ci
```

The `--ci` flag outputs structured results suited for CI environments.

### SARIF annotations

```yaml
- name: Validate typography
  run: npx fetchtype validate -i fetchtype.tokens.json --ci --sarif
```

SARIF output integrates with GitHub Code Scanning, producing inline annotations on PRs that point to exact rule violations.

### Step summaries

```yaml
- name: Validate typography
  run: npx fetchtype validate -i fetchtype.tokens.json --github
```

The `--github` flag writes a formatted summary to `$GITHUB_STEP_SUMMARY`.

### Reusable composite action

The repo includes a composite action at `.github/actions/validate` that handles pnpm/Node setup and runs validation:

```yaml
- uses: fetchtype/fetchtype/.github/actions/validate@main
  with:
    token-file: fetchtype.tokens.json
```

#### Action inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `token-file` | yes | — | Path to the token JSON file |
| `package-spec` | no | `fetchtype` | npm package or local tarball path |
| `github-annotations` | no | `true` | Emit step summaries and annotations |
| `node-version` | no | `20` | Node.js version |
| `pnpm-version` | no | `10` | pnpm version |

## Pre-commit hook

Install a git pre-commit hook that validates tokens before every commit:

```bash
fetchtype check --install-hook
```

This creates a `.git/hooks/pre-commit` that runs `fetchtype check` on staged `*.tokens.json` files.

### With lint-staged

If you already use lint-staged:

```json
{
  "lint-staged": {
    "*.tokens.json": ["fetchtype check"]
  }
}
```

## Drift detection

Compare two token snapshots to detect breaking changes:

```bash
fetchtype drift --baseline tokens.baseline.json --current tokens.json
```

Reports changes in plain language:

- **Breaking** — removed tokens, changed types, reduced contrast below threshold
- **Non-breaking** — added tokens, increased sizes, added new themes

Useful in PR descriptions, release notes, or as a CI check to flag breaking typography changes before merge.
