# Examples

Starter configurations for common stacks. Each directory contains a token file, a fetchtype config, and a README with integration steps.

## Stacks

| Example | Preset | Export Format | Use Case |
|---------|--------|---------------|----------|
| [nextjs-tailwind](./nextjs-tailwind/) | base | Tailwind config | SaaS dashboards, admin panels |
| [astro-shadcn](./astro-shadcn/) | editorial | shadcn CSS | Content sites, blogs, documentation |

## CI Workflows

| Workflow | Purpose |
|----------|---------|
| [Basic](./ci/github-actions-basic.yml) | Validate on every PR with inline annotations |
| [SARIF](./ci/github-actions-sarif.yml) | Upload results to GitHub Code Scanning |
| [Reusable Action](./ci/github-actions-reusable.yml) | Use the fetchtype composite action |

See [ci/README.md](./ci/README.md) for details on when to use each.

## Adding your own

1. `npx fetchtype init --preset <name>` to generate a token file
2. Create a `.fetchtype.json` config (see [Configuration](https://fetchtype.dev))
3. Run `npx fetchtype validate -i fetchtype.tokens.json` to verify
4. Run `npx fetchtype build -i fetchtype.tokens.json --format <format>` to export

Available presets: base, editorial, dashboard, ecommerce, docs, fluent, material, carbon, spectrum, radix.
