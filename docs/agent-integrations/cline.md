# fetchtype — Typography Validation

This project uses fetchtype for typography token validation and export. Always run validation after token changes.

## Key files

- `fetchtype.tokens.json` — typography, color, spacing, hierarchy tokens
- `.fetchtype.json` — rule configuration (optional)

## Workflow

```bash
# Validate (run after any token change)
fetchtype validate -i fetchtype.tokens.json

# Export to framework
fetchtype build -i fetchtype.tokens.json --format tailwind
fetchtype build -i fetchtype.tokens.json --format shadcn
fetchtype build -i fetchtype.tokens.json --format all
```

## Token schema

12 typography contexts: heading, subheading, body, caption, button, label, input, code, blockquote, chart-label, chart-axis, chart-title. Color tokens per mode (light/dark). Hierarchy with type scale and headings h1-h6. Spacing scale. Layout widths and breakpoints.

## 20 validation rules

WCAG AA contrast (4.5:1), body line-height >= 1.5, button font-size >= 14px, caption/label >= 11px, prose width <= 75ch, heading size hierarchy, heading vs body line-height, spacing monotonicity, scale divergence, dark mode completeness, font fallbacks, payload <= 150 KB, reference cycles, weight availability, variable font axes, subset coverage, font-display strategy, preload count <= 4, fluid type clamp(), allowlist/blocklist.

## Font tools

```bash
fetchtype suggest -c interface      # Recommendations by context
fetchtype pair "Inter"              # Pairing suggestions
fetchtype search "geometric sans"   # Search 1,929 fonts
fetchtype resolve Inter             # Full metadata + fallback CSS
fetchtype audit --dir src/          # Scan CSS/HTML for issues
```

## MCP server (12 tools)

Add to MCP config for direct agent access:

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
