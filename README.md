# fetchtype

Typography validation and token build system for design-system teams. Catch readability bugs, enforce WCAG thresholds, manage font intelligence, and export tokens to CSS, Tailwind, shadcn, and W3C Design Tokens — from one file.

```bash
pnpm add -D fetchtype
```

## Quick start

```bash
# Generate a starter token file
fetchtype init

# Start from a preset
fetchtype init --preset dashboard

# Or describe what you're building
fetchtype init --prompt "modern SaaS dashboard with dark mode"

# Validate against 20 rules
fetchtype validate -i fetchtype.tokens.json

# Export to any format
fetchtype build -i fetchtype.tokens.json --format tailwind

# Audit an existing project for typography issues
fetchtype audit --dir src/

# Find the right font for your context
fetchtype suggest -c interface

# Get pairing recommendations
fetchtype pair Inter
```

## What gets checked

20 rules covering accessibility, readability, font loading, and structural consistency:

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
| Font weight available | Requested weight exists in font |
| Font axis range | Variable font axis bounds respected |
| Subset coverage | Required subsets present in font |
| Font display strategy | Warns on `auto` (prefer `swap`) |
| Preload count | ≤ 4 preloaded web fonts |
| Fluid type ordering | `clamp()` min < max, body ≥ 12px |
| Font allowlist/blocklist | Policy enforcement via config |

## Configuration

Create `.fetchtype.json` in your project root to customize rules, set policies, and share config across repos:

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

Built-in profiles: `fetchtype:recommended`, `fetchtype:strict`, `fetchtype:accessibility` (WCAG AAA).

Configs are shareable via npm: `"extends": "@myorg/fetchtype-config"`.

## Commands

| Command | Description |
|---------|-------------|
| `init [output]` | Write a starter token file. `--preset`, `--prompt`, `--force` |
| `validate -i <path>` | Validate tokens. `--github`, `--ci`, `--json`, `--sarif` |
| `build -i <path>` | Export tokens. `--format` (css\|json\|tailwind\|shadcn\|w3c\|all) |
| `import -i <path>` | Import a W3C Design Tokens file |
| `suggest -c <context>` | Recommend fonts. Context: display\|interface\|reading\|mono\|editorial\|data |
| `pair <font>` | Get pairing recommendations for a font |
| `search <query>` | Search the 1,929-font registry |
| `resolve <font>` | Get full metadata for a font |
| `audit --dir <path>` | Scan CSS/Tailwind/HTML for typography issues |
| `prepare -i <path>` | Download, subset, and optimize web fonts |
| `preview -i <path>` | Start a live preview server with file watching |
| `check` | Fast validation for pre-commit hooks. `--install-hook` |
| `drift` | Compare token snapshots for breaking changes |
| `generate` | Generate validated tokens from context + constraints |
| `mcp` | Start an MCP server for AI agent integration |

## Font registry

1,929 Google Fonts with enriched metadata:

- **Context scores** — display, interface, reading, mono, editorial, data fitness (0–1)
- **Curated + algorithmic pairings** — 369 curated recommendations for 123 popular fonts, algorithmic coverage for all 1,929
- **Size guidance** — per-font recommended body/display/caption sizes
- **Performance estimates** — file size, loading strategy recommendations
- **Tags** — 100% coverage with semantic classification
- **Fallback CSS** — platform-aware fallback font stacks

```bash
# Find the best interface fonts under 80KB
fetchtype search --context interface --max-size 80

# Get Inter's full profile
fetchtype resolve Inter
```

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

### GitHub Actions (SARIF annotations)

```yaml
- name: Validate typography
  run: pnpm exec fetchtype validate -i fetchtype.tokens.json --ci --sarif
```

SARIF output integrates with GitHub Code Scanning for inline PR annotations.

### Pre-commit hook

```bash
fetchtype check --install-hook
```

Or with lint-staged:

```json
{ "*.tokens.json": ["fetchtype check"] }
```

### Drift detection

```bash
fetchtype drift --baseline tokens.baseline.json --current tokens.json
```

Reports breaking vs. non-breaking typography changes in plain language.

## Presets

| Preset | Tuned for |
|--------|-----------|
| `base` | General-purpose defaults |
| `editorial` | Long-form reading — larger body, generous line-height, serif, 65ch prose |
| `dashboard` | Data-dense — compact body, tighter line-height, monospace, wider content |
| `ecommerce` | Product and conversion pages |
| `docs` | Documentation sites |
| `carbon` | IBM Carbon Design System tokens |
| `fluent` | Microsoft Fluent Design System tokens |
| `material` | Google Material Design 3 tokens |
| `radix` | Radix UI tokens |
| `spectrum` | Adobe Spectrum Design System tokens |

## AI agent integration

fetchtype includes an MCP server with 12 tools so AI coding agents can validate, generate, and manage typography tokens:

```bash
fetchtype mcp
```

### MCP tools

| Tool | Description |
|------|-------------|
| `fetchtype_validate` | Validate a token file |
| `fetchtype_build` | Export tokens to any format |
| `fetchtype_suggest` | Font recommendations by context |
| `fetchtype_init` | Generate starter tokens |
| `fetchtype_presets` | List available presets |
| `fetchtype_audit` | Scan a project for typography issues |
| `fetchtype_pair` | Get font pairing recommendations |
| `fetchtype_search` | Search the font registry |
| `fetchtype_resolve` | Get full font metadata |
| `fetchtype_prepare` | Download and optimize web fonts |
| `fetchtype_generate` | One-call validated token generation |
| `fetchtype_drift` | Compare token snapshots |

All responses follow a structured decision protocol with `decision`, `confidence`, `alternatives`, and `nextAction` fields for seamless agent workflows.

### One-call token generation

```bash
fetchtype generate --context saas-dashboard --budget 100kb --accessibility wcag-aa
```

Or via MCP: agents send context + constraints, get back a complete validated token file. No multi-step workflow needed.

## Packages

| Package | Description |
|---------|-------------|
| `fetchtype` | CLI and MCP server |
| `@fetchtype/core` | Validation engine, presets, exporters, drift detection |
| `@fetchtype/types` | Zod schemas and shared contracts |
| `@fetchtype/fonts` | Font registry, pairing engine, scoring, size guidance |
| `@fetchtype/ui` | Shared Astro components |

## Links

- [fetchtype.com](https://fetchtype.com) — Homepage and font registry
- [fetchtype.dev](https://fetchtype.dev) — Documentation
- [npm](https://www.npmjs.com/package/fetchtype)

## License

MIT
