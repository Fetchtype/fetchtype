# fetchtype

Typography validation for design systems. Catch readability bugs, enforce WCAG thresholds, and export tokens to CSS, Tailwind, shadcn, and W3C Design Tokens — from one file.

```bash
pnpm add -D fetchtype
```

## Quick start

```bash
# Generate a starter token file
fetchtype init

# Start from a preset (editorial | dashboard | ecommerce | docs)
fetchtype init --preset dashboard

# Or describe what you're building
fetchtype init --prompt "modern SaaS dashboard with dark mode"

# Validate against 13 rules
fetchtype validate -i fetchtype.tokens.json

# Export to any format
fetchtype build -i fetchtype.tokens.json --format tailwind
```

## What gets checked

13 rules covering accessibility, readability, and structural consistency:

| Rule | Threshold |
|------|-----------|
| Text contrast | ≥ 4.5:1 (WCAG AA) |
| Body line-height | ≥ 1.5 |
| Button font-size | ≥ 14px |
| Caption / label font-size | ≥ 11px |
| Prose width | ≤ 75ch |
| Heading size direction | h1 → h6 decreasing |
| Heading line-height | < body line-height |
| Spacing scale | Monotonically increasing |
| Scale divergence | Within ±10% of computed scale |
| Dark mode completeness | All themes covered |
| Font fallback chains | Generic fallback present |
| Font payload | ≤ 150 KB estimated |
| Token references | Resolve without cycles |

## Commands

| Command | Description |
|---------|-------------|
| `init [output]` | Write a starter token file. `--preset`, `--prompt`, `--force` |
| `validate -i <path>` | Validate tokens. `--github` for PR annotations, `--json` |
| `build -i <path>` | Export tokens. `--format` (css\|json\|tailwind\|shadcn\|w3c\|all) |
| `import -i <path>` | Import a W3C Design Tokens file |
| `suggest -c <context>` | Recommend fonts. Context: display\|interface\|reading\|mono |
| `preview -i <path>` | Start a live preview server with file watching |
| `mcp` | Start an MCP server for AI agent integration |

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

12 typography contexts: heading, subheading, body, caption, button, label, input, code, blockquote, chart-label, chart-axis, chart-title. Plus color, spacing, layout, hierarchy, optional themes and modes.

## Export formats

```bash
fetchtype build -i fetchtype.tokens.json -o dist/tokens --format all
```

| Format | Output | Description |
|--------|--------|-------------|
| `css` | `tokens.css` | CSS custom properties with configurable prefix |
| `json` | `tokens.json` | Fully resolved token values |
| `tailwind` | `tailwind.config.ts` | `theme.extend` partial |
| `shadcn` | `shadcn.css` | HSL variables, shadcn-compatible |
| `w3c` | `tokens.w3c.json` | W3C Design Tokens Community Group format |

## CI integration

Add `--github` to emit inline PR annotations and a step summary:

```yaml
- name: Validate typography
  run: pnpm exec fetchtype validate -i fetchtype.tokens.json --github
```

## Presets

| Preset | Tuned for |
|--------|-----------|
| `base` | General-purpose defaults |
| `editorial` | Long-form reading — larger body, generous line-height, serif, 65ch prose |
| `dashboard` | Data-dense — compact body, tighter line-height, monospace, wider content |
| `ecommerce` | Product and conversion pages |
| `docs` | Documentation sites |

## AI agent integration

fetchtype includes an MCP server so AI coding agents can validate and generate typography tokens directly:

```bash
fetchtype mcp
```

Exposes five tools: `validate`, `build`, `suggest`, `init`, and `presets`.

## Links

- [fetchtype.com](https://fetchtype.com) — Homepage
- [fetchtype.dev](https://fetchtype.dev) — Documentation
- [npm](https://www.npmjs.com/package/fetchtype)

## License

MIT
