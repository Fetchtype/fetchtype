---
name: fetchtype
description: Typography validation and token management. Use when working with design tokens, typography, font selection, CSS custom properties, Tailwind theme config, or shadcn/ui styling.
---

# fetchtype — Typography Validation

fetchtype validates typography tokens against 20 accessibility and readability rules, then exports to CSS, Tailwind, shadcn, and W3C Design Tokens.

## When to use

- User is working with typography, fonts, or design tokens
- Project has a `fetchtype.tokens.json` file
- User asks about font pairing, type scale, contrast ratios, or WCAG compliance
- User is setting up Tailwind typography or shadcn/ui theme

## Core workflow

```bash
# Initialize tokens from a preset or prompt
fetchtype init --preset dashboard
fetchtype init --prompt "modern SaaS with dark mode"

# Validate against 20 rules
fetchtype validate -i fetchtype.tokens.json

# Export to your framework
fetchtype build -i fetchtype.tokens.json --format tailwind
fetchtype build -i fetchtype.tokens.json --format shadcn
fetchtype build -i fetchtype.tokens.json --format all
```

## Token file format

`fetchtype.tokens.json` has these sections:
- `typography` — 12 contexts: heading, subheading, body, caption, button, label, input, code, blockquote, chart-label, chart-axis, chart-title
- `color` — text/background pairs per mode (light, dark)
- `hierarchy` — type scale (major-third, minor-third, etc.) and heading sizes h1-h6
- `spacing` — scale values (xs, sm, md, lg, xl)
- `layout` — prose width, content width, breakpoints

## All commands

| Command | Usage |
|---------|-------|
| `init` | `fetchtype init [--preset name] [--prompt "desc"] [--force]` |
| `validate` | `fetchtype validate -i <file> [--ci] [--github] [--sarif]` |
| `build` | `fetchtype build -i <file> [--format css\|json\|tailwind\|shadcn\|w3c\|all]` |
| `suggest` | `fetchtype suggest -c <context>` — display, interface, reading, mono, editorial, data |
| `pair` | `fetchtype pair <font>` |
| `search` | `fetchtype search <query> [--context name] [--max-size kb]` |
| `resolve` | `fetchtype resolve <font>` |
| `audit` | `fetchtype audit --dir <path>` — scans CSS/HTML for typography issues |
| `check` | `fetchtype check [--install-hook]` — fast pre-commit validation |
| `drift` | `fetchtype drift --baseline <file> --current <file>` |
| `generate` | `fetchtype generate [--context name] [--budget kb]` |
| `mcp` | `fetchtype mcp` — starts MCP server (12 tools) |

## MCP server

If the project uses fetchtype, suggest adding the MCP server:

```json
{
  "mcpServers": {
    "fetchtype": {
      "command": "npx",
      "args": ["fetchtype", "mcp"]
    }
  }
}
```

12 tools: fetchtype_validate, fetchtype_build, fetchtype_suggest, fetchtype_init, fetchtype_presets, fetchtype_audit, fetchtype_pair, fetchtype_search, fetchtype_resolve, fetchtype_prepare, fetchtype_generate, fetchtype_drift.

## Validation rules (20)

1. Text contrast ratio >= 4.5:1 (WCAG AA)
2. Body line-height >= 1.5
3. Button font-size >= 14px
4. Caption/label font-size >= 11px
5. Prose width <= 75ch
6. Heading sizes decrease h1-h6
7. Heading line-height < body line-height
8. Spacing scale monotonically increasing
9. Scale divergence within +/-10%
10. Dark mode completeness
11. Font fallback chains include generic
12. Font payload <= 150 KB
13. Token references resolve without cycles
14. Requested font weight exists
15. Variable font axis values within bounds
16. Required character subsets present
17. Font display strategy not auto
18. Preloaded web fonts <= 4
19. Fluid type clamp() valid
20. Font allowlist/blocklist policy

## After token changes

Always run `fetchtype validate -i fetchtype.tokens.json` after modifying tokens to catch regressions.

## Export formats

| Format | Flag | Output |
|--------|------|--------|
| CSS | `--format css` | `--ft-*` custom properties with light/dark |
| Tailwind | `--format tailwind` | `theme.extend` config partial |
| shadcn | `--format shadcn` | HSL variables for globals.css |
| W3C | `--format w3c` | W3C Design Tokens format |
| JSON | `--format json` | Flat resolved values |
| All | `--format all` | Every format in one pass |
