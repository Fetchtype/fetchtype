# fetchtype

**Typography that ships correct.** Validate tokens, enforce WCAG, and export to CSS, Tailwind, shadcn, and W3C Design Tokens — from one file.

Every design system gets typography wrong eventually. Heading scales drift, contrast breaks, font payloads bloat, dark mode gets forgotten. fetchtype catches these problems before they reach production.

```bash
npx fetchtype init
npx fetchtype validate -i fetchtype.tokens.json
npx fetchtype build -i fetchtype.tokens.json --format tailwind
```

## Why fetchtype?

- **20 validation rules** — contrast, line-height, font loading, scale consistency, dark mode coverage, and more
- **WCAG AA/AAA enforcement** — not just contrast; body line-height, button tap targets, caption legibility
- **Export anywhere** — CSS custom properties, Tailwind config, shadcn variables, W3C Design Tokens
- **1,929-font registry** — context-aware scoring, curated pairings, size guidance, performance budgets
- **CI-ready** — GitHub Actions annotations, SARIF output, pre-commit hooks, drift detection
- **One-command setup** — `fetchtype init --preset dashboard` gives you production-ready tokens in seconds

## Install

```bash
# npm
npm install -D fetchtype

# pnpm
pnpm add -D fetchtype

# yarn
yarn add -D fetchtype
```

## Quick start

```bash
# Generate a starter token file
fetchtype init

# Start from a preset tuned for your use case
fetchtype init --preset dashboard

# Or describe what you're building in plain English
fetchtype init --prompt "modern SaaS dashboard with dark mode"

# Validate your tokens against 20 rules
fetchtype validate -i fetchtype.tokens.json

# Export to your framework
fetchtype build -i fetchtype.tokens.json --format tailwind
```

## What gets validated

fetchtype checks 20 rules covering accessibility, readability, font loading, and structural consistency:

| Rule | What it checks | Threshold |
|------|---------------|-----------|
| Contrast | Text against background | WCAG AA ≥ 4.5:1 |
| Body line-height | Readable paragraph spacing | ≥ 1.5 |
| Button font-size | Tap target legibility | ≥ 14px |
| Caption / label size | Small text legibility | ≥ 11px |
| Prose width | Line length for readability | ≤ 75ch |
| Heading direction | Scale flows h1 → h6 | Monotonically decreasing |
| Heading line-height | Tighter than body | < body line-height |
| Spacing scale | Consistent spacing ramp | Monotonically increasing |
| Scale divergence | Matches computed type scale | Within ±10% |
| Dark mode | Theme completeness | All modes covered |
| Font fallbacks | System fallback chain | Generic fallback present |
| Font payload | Web font budget | ≤ 150 KB |
| Token references | Alias resolution | No circular references |
| Font weight | Weight availability | Requested weight exists |
| Font axis range | Variable font bounds | Axis values in range |
| Subset coverage | Character set support | Required subsets present |
| Font display | Loading strategy | Warns on `auto` |
| Preload count | Font preload limit | ≤ 4 preloaded fonts |
| Fluid type | Clamp ordering | min < max, body ≥ 12px |
| Font policy | Allow/block enforcement | Per-config rules |

## Example output

```
$ fetchtype validate -i fetchtype.tokens.json

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

## Token format

fetchtype uses a single JSON file to describe your entire typography system:

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

Supports 12 typography contexts: `heading`, `subheading`, `body`, `caption`, `button`, `label`, `input`, `code`, `blockquote`, `chart-label`, `chart-axis`, `chart-title`. Plus `color`, `spacing`, `layout`, `hierarchy`, themes, and modes.

## Export formats

```bash
fetchtype build -i fetchtype.tokens.json -o dist/tokens --format all
```

| Format | Output | Use case |
|--------|--------|----------|
| `css` | `tokens.css` | CSS custom properties with configurable prefix |
| `json` | `tokens.json` | Fully resolved values for JS/TS consumption |
| `tailwind` | `tailwind.config.ts` | Drop-in `theme.extend` partial |
| `shadcn` | `shadcn.css` | HSL variables compatible with shadcn/ui |
| `w3c` | `tokens.w3c.json` | W3C Design Tokens Community Group format |

## Commands

| Command | Description |
|---------|-------------|
| `init [output]` | Generate a starter token file. Flags: `--preset`, `--prompt`, `--force` |
| `validate -i <file>` | Validate tokens against all rules. Flags: `--ci`, `--github`, `--json`, `--sarif` |
| `build -i <file>` | Export tokens. Flags: `--format` (css\|json\|tailwind\|shadcn\|w3c\|all), `--out-dir` |
| `import -i <file>` | Import tokens from a W3C Design Tokens file |
| `suggest -c <context>` | Font recommendations. Contexts: display, interface, reading, mono, editorial, data |
| `pair <font>` | Get pairing recommendations for any font |
| `search <query>` | Search the 1,929-font registry by name, category, or tag |
| `resolve <font>` | Get full metadata, scores, and pairings for a font |
| `audit --dir <path>` | Scan CSS, Tailwind, and HTML files for typography issues |
| `prepare -i <file>` | Download, subset, and optimize web fonts |
| `preview -i <file>` | Start a live preview server with file watching |
| `check` | Fast validation for pre-commit hooks. `--install-hook` to set up |
| `drift` | Compare token snapshots and report breaking changes |
| `generate` | Generate validated tokens from context and constraints |
| `mcp` | Start an MCP server for AI agent integration (12 tools) |

## Presets

Start with a preset and customize from there:

```bash
fetchtype init --preset editorial
```

| Preset | Tuned for |
|--------|-----------|
| `base` | General-purpose defaults |
| `editorial` | Long-form reading — larger body, generous line-height, serif stacks, 65ch prose width |
| `dashboard` | Data-dense interfaces — compact body, tighter line-height, monospace, wider content |
| `ecommerce` | Product pages and conversion flows |
| `docs` | Documentation and knowledge bases |
| `carbon` | IBM Carbon Design System alignment |
| `fluent` | Microsoft Fluent Design System alignment |
| `material` | Google Material Design 3 alignment |
| `radix` | Radix UI alignment |
| `spectrum` | Adobe Spectrum Design System alignment |

## Font registry

fetchtype includes a registry of 1,929 Google Fonts with enriched metadata beyond what the Google Fonts API provides:

- **Context scores** — how well each font fits display, interface, reading, mono, editorial, and data contexts (scored 0–1)
- **Curated pairings** — 369 hand-picked recommendations for 123 popular fonts, plus algorithmic pairings for all 1,929
- **Size guidance** — per-font recommended sizes for body, display, and caption use
- **Performance data** — file size estimates and loading strategy recommendations
- **Semantic tags** — every font classified by style, mood, and use case
- **Fallback stacks** — platform-aware CSS fallback chains

```bash
# Find the best interface fonts under 80 KB
fetchtype search --context interface --max-size 80

# Get Inter's full profile: scores, pairings, sizes, metadata
fetchtype resolve Inter

# Get pairing suggestions for any font
fetchtype pair "Source Sans 3"
```

## Configuration

Create `.fetchtype.json` in your project root to customize rules, enforce policies, and share config across repos:

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

Built-in profiles:
- `fetchtype:recommended` — sensible defaults for most projects
- `fetchtype:strict` — tighter thresholds, all warnings promoted to errors
- `fetchtype:accessibility` — WCAG AAA enforcement (7:1 contrast, stricter sizing)

Share configs via npm: `"extends": "@myorg/fetchtype-config"`.

## CI integration

### GitHub Actions

```yaml
- name: Validate typography
  run: npx fetchtype validate -i fetchtype.tokens.json --ci --sarif
```

SARIF output integrates with GitHub Code Scanning for inline PR annotations. Use `--github` for step summaries.

A reusable composite action is included at `.github/actions/validate`:

```yaml
- uses: fetchtype/fetchtype/.github/actions/validate@main
  with:
    token-file: fetchtype.tokens.json
```

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

Reports breaking vs. non-breaking typography changes in plain language — useful for PR reviews and release notes.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `fetchtype` | [![npm](https://img.shields.io/npm/v/fetchtype)](https://www.npmjs.com/package/fetchtype) | CLI — validation, export, font tools |
| `@fetchtype/core` | | Validation engine, presets, exporters, drift detection |
| `@fetchtype/types` | | Zod schemas and TypeScript contracts |
| `@fetchtype/fonts` | | Font registry, pairing engine, scoring, size guidance |

## Contributing

```bash
git clone https://github.com/fetchtype/fetchtype.git
cd fetchtype
pnpm install
pnpm build
pnpm test
```

## AI agent integration

fetchtype includes an MCP server with 12 tools so AI coding agents can validate, generate, and manage typography tokens directly. See [`llms.txt`](llms.txt) for the full machine-readable reference.

```bash
fetchtype mcp
```

Tools: `fetchtype_validate`, `fetchtype_build`, `fetchtype_suggest`, `fetchtype_init`, `fetchtype_presets`, `fetchtype_audit`, `fetchtype_pair`, `fetchtype_search`, `fetchtype_resolve`, `fetchtype_prepare`, `fetchtype_generate`, `fetchtype_drift`.

## Links

- [fetchtype.com](https://fetchtype.com) — Homepage and font registry
- [fetchtype.dev](https://fetchtype.dev) — Documentation
- [npm](https://www.npmjs.com/package/fetchtype)

## License

MIT
