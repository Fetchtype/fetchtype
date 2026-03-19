# fetchtype

> Typography validation and token build system for design-system teams.

fetchtype validates typography tokens against 20 accessibility and readability rules (WCAG AA/AAA contrast, line-height, font loading, scale consistency, dark mode coverage), then exports to CSS custom properties, Tailwind config, shadcn/ui variables, and W3C Design Tokens format. It includes a 1,929-font registry with context-aware scoring, curated pairings, and size guidance.

## Installation

```bash
npm install -D fetchtype
```

## Core workflow

```bash
# 1. Generate a starter token file (interactive or from a preset)
fetchtype init
fetchtype init --preset dashboard
fetchtype init --prompt "modern SaaS dashboard with dark mode"

# 2. Validate tokens against 20 rules
fetchtype validate -i fetchtype.tokens.json

# 3. Export to your framework
fetchtype build -i fetchtype.tokens.json --format tailwind
fetchtype build -i fetchtype.tokens.json --format all
```

## Token file format

fetchtype uses a single JSON file (`fetchtype.tokens.json`) with these top-level sections:

- `typography` — font sizes, line heights, letter spacing for 12 contexts: heading, subheading, body, caption, button, label, input, code, blockquote, chart-label, chart-axis, chart-title
- `color` — text/background pairs per theme (light, dark, or custom modes)
- `hierarchy` — type scale (e.g. major-third) and base size
- `spacing` — spacing scale values
- `layout` — prose width, content width

Example:
```json
{
  "typography": {
    "heading": { "lineHeight": 1.1, "fontSize": "3rem" },
    "body": { "lineHeight": 1.6, "fontSize": "1rem" },
    "button": { "fontSize": "0.9375rem" },
    "caption": { "fontSize": "0.8125rem" }
  },
  "color": {
    "light": { "text": "#111827", "background": "#ffffff" },
    "dark": { "text": "#f9fafb", "background": "#111827" }
  },
  "hierarchy": {
    "scale": "major-third",
    "baseSize": "1rem"
  }
}
```

## All CLI commands

| Command | Usage |
|---------|-------|
| `init` | `fetchtype init [output] [--preset name] [--prompt "description"] [--force]` |
| `validate` | `fetchtype validate -i <file> [--ci] [--github] [--json] [--sarif]` |
| `build` | `fetchtype build -i <file> [--format css|json|tailwind|shadcn|w3c|all] [--out-dir path]` |
| `import` | `fetchtype import -i <w3c-file>` |
| `suggest` | `fetchtype suggest -c <context>` — contexts: display, interface, reading, mono, editorial, data |
| `pair` | `fetchtype pair <font-name>` |
| `search` | `fetchtype search <query> [--context name] [--max-size kb]` |
| `resolve` | `fetchtype resolve <font-name>` |
| `audit` | `fetchtype audit --dir <path>` — scans CSS, Tailwind, HTML for typography issues |
| `prepare` | `fetchtype prepare -i <file>` — downloads, subsets, optimizes web fonts |
| `preview` | `fetchtype preview -i <file>` — live preview server with file watching |
| `check` | `fetchtype check [--install-hook]` — fast validation for pre-commit hooks |
| `drift` | `fetchtype drift --baseline <file> --current <file>` — breaking change detection |
| `generate` | `fetchtype generate [--context name] [--budget kb] [--accessibility level]` |
| `mcp` | `fetchtype mcp` — starts MCP server (see below) |

## Presets

Available presets: `base`, `editorial`, `dashboard`, `ecommerce`, `docs`, `carbon`, `fluent`, `material`, `radix`, `spectrum`.

Each preset is a complete token file that passes all 20 validation rules.

## Configuration

Create `.fetchtype.json` in the project root:

```json
{
  "extends": "fetchtype:recommended",
  "rules": {
    "contrast.ratio": { "severity": "error", "threshold": 7 },
    "font.preload-count": { "severity": "warn", "max": 3 }
  },
  "fonts": {
    "allow": ["Inter", "JetBrains Mono"],
    "block": [{ "family": "Comic Sans MS", "reason": "Brand guidelines" }]
  },
  "performance": {
    "budget": 120
  }
}
```

Profiles: `fetchtype:recommended` (default), `fetchtype:strict`, `fetchtype:accessibility` (WCAG AAA).

Shareable via npm: `"extends": "@myorg/fetchtype-config"`.

## Export formats

| Format | Flag | Output file | Description |
|--------|------|-------------|-------------|
| CSS | `--format css` | `tokens.css` | CSS custom properties with configurable prefix |
| JSON | `--format json` | `tokens.json` | Fully resolved token values |
| Tailwind | `--format tailwind` | `tailwind.config.ts` | `theme.extend` partial for Tailwind CSS |
| shadcn | `--format shadcn` | `shadcn.css` | HSL variables compatible with shadcn/ui |
| W3C | `--format w3c` | `tokens.w3c.json` | W3C Design Tokens Community Group format |
| All | `--format all` | All of the above | Every format in one pass |

## MCP server

fetchtype exposes 12 tools via Model Context Protocol for AI agent integration:

```bash
fetchtype mcp
```

Tools: `fetchtype_validate`, `fetchtype_build`, `fetchtype_suggest`, `fetchtype_init`, `fetchtype_presets`, `fetchtype_audit`, `fetchtype_pair`, `fetchtype_search`, `fetchtype_resolve`, `fetchtype_prepare`, `fetchtype_generate`, `fetchtype_drift`.

All MCP responses include structured fields: `decision`, `confidence`, `alternatives`, `nextAction`.

## Validation rules

The 20 built-in rules:

1. Text contrast ratio ≥ 4.5:1 (WCAG AA)
2. Body line-height ≥ 1.5
3. Button font-size ≥ 14px
4. Caption/label font-size ≥ 11px
5. Prose width ≤ 75ch
6. Heading sizes decrease h1 → h6
7. Heading line-height < body line-height
8. Spacing scale monotonically increasing
9. Scale divergence within ±10%
10. Dark mode completeness (all themes covered)
11. Font fallback chains include generic fallback
12. Font payload ≤ 150 KB
13. Token references resolve without cycles
14. Requested font weight exists in font
15. Variable font axis values within bounds
16. Required character subsets present
17. Font display strategy not `auto`
18. Preloaded web fonts ≤ 4
19. Fluid type clamp() min < max, body ≥ 12px
20. Font allowlist/blocklist policy enforcement

## Font registry

1,929 Google Fonts with enriched metadata:
- Context fitness scores (0–1) for: display, interface, reading, mono, editorial, data
- 369 curated pairings for 123 popular fonts + algorithmic pairings for all fonts
- Per-font recommended sizes for body, display, caption
- File size estimates and loading strategy recommendations
- Semantic tags and classification
- Platform-aware CSS fallback stacks

## CI integration

GitHub Actions with SARIF:
```yaml
- run: npx fetchtype validate -i fetchtype.tokens.json --ci --sarif
```

Pre-commit hook:
```bash
fetchtype check --install-hook
```

lint-staged:
```json
{ "*.tokens.json": ["fetchtype check"] }
```

## Links

- Homepage: https://fetchtype.com
- Documentation: https://fetchtype.dev
- npm: https://www.npmjs.com/package/fetchtype
- GitHub: https://github.com/fetchtype/fetchtype
