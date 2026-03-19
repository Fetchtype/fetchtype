# fetchtype

**Typography that ships correct.** Validate tokens, enforce WCAG, and export to CSS, Tailwind, shadcn, and W3C Design Tokens — from one file.

```bash
npx fetchtype init
npx fetchtype validate -i fetchtype.tokens.json
npx fetchtype build -i fetchtype.tokens.json --format tailwind
```

## Install

```bash
npm install -D fetchtype
```

## Quick start

```bash
# Generate a starter token file
fetchtype init

# Start from a preset (editorial | dashboard | ecommerce | docs | carbon | material | ...)
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

## Commands

| Command | Description |
|---------|-------------|
| `init [output]` | Write a starter token file. `--preset`, `--prompt`, `--force` |
| `validate -i <path>` | Validate tokens. `--ci`, `--github`, `--json`, `--sarif` |
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

## Export formats

| Format | Output | Description |
|--------|--------|-------------|
| `css` | `tokens.css` | CSS custom properties with configurable prefix |
| `json` | `tokens.json` | Fully resolved token values |
| `tailwind` | `tailwind.config.ts` | `theme.extend` partial |
| `shadcn` | `shadcn.css` | HSL variables, shadcn-compatible |
| `w3c` | `tokens.w3c.json` | W3C Design Tokens Community Group format |

## AI agent integration (MCP)

fetchtype includes an MCP server with 12 tools so AI coding agents can validate, generate, and manage typography tokens directly:

```bash
fetchtype mcp
```

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

All responses follow a structured protocol with `decision`, `confidence`, `alternatives`, and `nextAction` fields.

## CI integration

```yaml
- name: Validate typography
  run: npx fetchtype validate -i fetchtype.tokens.json --ci --sarif
```

Pre-commit hook:

```bash
fetchtype check --install-hook
```

## Configuration

Create `.fetchtype.json` in your project root:

```json
{
  "extends": "fetchtype:recommended",
  "rules": {
    "contrast.ratio": { "severity": "error", "threshold": 7 }
  },
  "fonts": {
    "allow": ["Inter", "JetBrains Mono"],
    "block": [{ "family": "Comic Sans MS", "reason": "Brand guidelines" }]
  }
}
```

Profiles: `fetchtype:recommended`, `fetchtype:strict`, `fetchtype:accessibility`.

## Links

- [fetchtype.com](https://fetchtype.com) — Homepage and font registry
- [fetchtype.dev](https://fetchtype.dev) — Documentation
- [GitHub](https://github.com/fetchtype/fetchtype)

## License

MIT
