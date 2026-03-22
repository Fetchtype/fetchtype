# fetchtype

**Typography that ships correct.**

Every design system gets typography wrong eventually — heading scales drift, contrast breaks, font payloads bloat, dark mode gets forgotten. fetchtype catches these problems before they reach production.

One JSON file. 20 validation rules. Export to Tailwind, shadcn, CSS, or W3C Design Tokens.

```bash
npx fetchtype init --preset dashboard
npx fetchtype validate -i fetchtype.tokens.json
npx fetchtype build -i fetchtype.tokens.json --format tailwind
```

```
  fetchtype v0.2.0

  ✓ contrast.ratio          4.5:1 — passes WCAG AA
  ✓ body.line-height        1.6 ≥ 1.5
  ✓ button.font-size        15px ≥ 14px
  ✓ caption.font-size       13px ≥ 11px
  ✓ prose.width             65ch ≤ 75ch
  ✓ heading.direction       h1 > h2 > h3 > h4 > h5 > h6
  ✓ heading.line-height     1.1 < 1.6
  ✗ dark-mode.completeness  missing dark theme

  19 passed · 1 failed
```

## Install

```bash
npm install -D fetchtype
```

## What it does

**Validate** — 20 rules check contrast ratios, line-height, font loading, type scale consistency, dark mode completeness, font payloads, and more. WCAG AA by default, AAA optional.

**Export** — One command outputs CSS custom properties, Tailwind config, shadcn/ui HSL variables, resolved JSON, or W3C Design Tokens format.

**Font intelligence** — A registry of 1,929 Google Fonts with context-aware fitness scores, curated pairings, per-font size guidance, performance budgets, and platform-aware fallback stacks. Ask it what font to use and it tells you.

**CI** — GitHub Actions annotations via SARIF, pre-commit hooks, drift detection between token snapshots. Typography becomes a checked gate, not a hope.

**AI-native** — MCP server with 12 tools. Agents can validate, generate, search fonts, and export tokens without any manual steps. See [`llms.txt`](llms.txt).

## Quick start

```bash
# Start from a preset
fetchtype init --preset dashboard

# Or describe what you're building
fetchtype init --prompt "modern SaaS dashboard with dark mode"

# Validate
fetchtype validate -i fetchtype.tokens.json

# Export to your stack
fetchtype build -i fetchtype.tokens.json --format tailwind
fetchtype build -i fetchtype.tokens.json --format shadcn
fetchtype build -i fetchtype.tokens.json --format all
```

### Works with

- **Tailwind CSS** — generates `theme.extend` config
- **shadcn/ui** — generates HSL CSS variables
- **Any CSS project** — generates custom properties
- **Design token pipelines** — W3C Design Tokens format
- **AI agents** — MCP server for programmatic access
- **CI/CD** — GitHub Actions, pre-commit hooks, SARIF

## Token format

```json
{
  "typography": {
    "heading":  { "lineHeight": 1.1, "fontSize": "3rem" },
    "body":     { "lineHeight": 1.6, "fontSize": "1rem" },
    "button":   { "fontSize": "0.9375rem" },
    "caption":  { "fontSize": "0.8125rem" }
  },
  "color": {
    "light": { "text": "#111827", "background": "#ffffff" },
    "dark":  { "text": "#f9fafb", "background": "#111827" }
  },
  "hierarchy": {
    "scale": "major-third",
    "baseSize": "1rem"
  }
}
```

12 typography contexts: `heading`, `subheading`, `body`, `caption`, `button`, `label`, `input`, `code`, `blockquote`, `chart-label`, `chart-axis`, `chart-title`. Plus `color`, `spacing`, `layout`, `hierarchy`, themes, and modes.

## Presets

Start with a preset tuned for your use case, then customize:

| Preset | Use case |
|--------|----------|
| `dashboard` | Data-dense interfaces — compact type, monospace, wide content |
| `editorial` | Long-form reading — generous line-height, serif stacks, 65ch prose |
| `ecommerce` | Product pages and conversion flows |
| `docs` | Documentation and knowledge bases |
| `base` | General-purpose defaults |
| `material` | Google Material Design 3 alignment |
| `carbon` | IBM Carbon alignment |
| `fluent` | Microsoft Fluent alignment |
| `radix` | Radix UI alignment |
| `spectrum` | Adobe Spectrum alignment |

## Font tools

```bash
# Find the best interface font under 80 KB
fetchtype search --context interface --max-size 80

# Get Inter's full profile: scores, pairings, recommended sizes
fetchtype resolve Inter

# Get pairing suggestions
fetchtype pair "Source Sans 3"

# Context-aware font recommendations
fetchtype suggest -c editorial
```

## Documentation

| Doc | What's in it |
|-----|-------------|
| [**llms.txt**](llms.txt) | Full machine-readable reference — install, every command with flags, token schema, all 20 rules, MCP tools |
| [**docs/validation-rules.md**](docs/validation-rules.md) | All 20 rules with thresholds, rationale, and how to configure each one |
| [**docs/configuration.md**](docs/configuration.md) | `.fetchtype.json` config, profiles, shareable configs, rule customization |
| [**docs/ci.md**](docs/ci.md) | GitHub Actions, SARIF, pre-commit hooks, lint-staged, drift detection |
| [**docs/mcp.md**](docs/mcp.md) | MCP server setup, all 12 tools, response format, agent integration |
| [**docs/export-formats.md**](docs/export-formats.md) | CSS, Tailwind, shadcn, W3C output details and customization |
| [**docs/agent-integrations/**](docs/agent-integrations/) | Drop-in configs for Claude Code, Cursor, Copilot, Windsurf, Cline |

## Commands

| Command | What it does |
|---------|-------------|
| `init` | Generate starter tokens — `--preset`, `--prompt`, `--force` |
| `validate` | Check tokens against 20 rules — `--ci`, `--github`, `--sarif` |
| `build` | Export to CSS, Tailwind, shadcn, W3C, JSON — `--format`, `--out-dir` |
| `suggest` | Font recommendations by context |
| `pair` | Pairing recommendations for any font |
| `search` | Search 1,929 fonts by name, context, size |
| `resolve` | Full metadata for a font |
| `audit` | Scan existing CSS/HTML for typography issues |
| `check` | Fast pre-commit validation — `--install-hook` |
| `drift` | Breaking change detection between token snapshots |
| `generate` | One-call validated token generation |
| `mcp` | Start MCP server (12 tools) for AI agents |

## Packages

| Package | Description |
|---------|-------------|
| [`fetchtype`](https://www.npmjs.com/package/fetchtype) | CLI and MCP server |
| `@fetchtype/core` | Validation engine, presets, exporters |
| `@fetchtype/types` | Zod schemas and TypeScript contracts |
| `@fetchtype/fonts` | Font registry, pairing engine, scoring |

## Contributing

```bash
git clone https://github.com/fetchtype/fetchtype.git
cd fetchtype
pnpm install
pnpm build
pnpm test
```

## Links

- [fetchtype.com](https://fetchtype.com) — Homepage and font registry
- [fetchtype.dev](https://fetchtype.dev) — Documentation
- [npm](https://www.npmjs.com/package/fetchtype)

## License

MIT
