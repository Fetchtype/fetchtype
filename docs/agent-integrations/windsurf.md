## fetchtype — Typography Validation

This project uses fetchtype for typography token validation and export.

### Token file

`fetchtype.tokens.json` is the single source of truth for the type system. It contains typography (12 contexts), color (light/dark), hierarchy (type scale, headings), spacing (scale values), and layout (prose width, breakpoints).

### After modifying tokens

Run `fetchtype validate -i fetchtype.tokens.json` to check 20 rules: WCAG AA contrast, body line-height >= 1.5, min font sizes, heading hierarchy, spacing monotonicity, dark mode completeness, font payloads, font-display strategy.

### Commands

- `fetchtype validate -i fetchtype.tokens.json` — validate
- `fetchtype build -i fetchtype.tokens.json --format tailwind` — Tailwind config
- `fetchtype build -i fetchtype.tokens.json --format shadcn` — shadcn/ui variables
- `fetchtype build -i fetchtype.tokens.json --format all` — all formats
- `fetchtype suggest -c interface` — font recommendations
- `fetchtype pair "Inter"` — pairing suggestions
- `fetchtype search "geometric sans" --variable` — search 1,929 fonts
- `fetchtype resolve Inter` — font metadata + fallback CSS
- `fetchtype audit --dir src/` — scan CSS/HTML for typography issues

### MCP server

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

### Export formats

CSS custom properties, Tailwind theme.extend, shadcn/ui HSL variables, W3C Design Tokens, resolved JSON.
