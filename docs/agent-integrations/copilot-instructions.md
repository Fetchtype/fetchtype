# fetchtype — Typography Validation

This project uses fetchtype for typography token validation and export.

## Token file

`fetchtype.tokens.json` contains typography, color, spacing, hierarchy, and layout tokens. It is the single source of truth for the project's type system.

## After modifying tokens

Always run `fetchtype validate -i fetchtype.tokens.json` to check against 20 rules covering WCAG AA contrast, line-height, font sizes, heading hierarchy, spacing monotonicity, dark mode completeness, font payloads, and font-display strategy.

## Commands

- `fetchtype validate -i fetchtype.tokens.json` — validate tokens
- `fetchtype build -i fetchtype.tokens.json --format tailwind` — export to Tailwind config
- `fetchtype build -i fetchtype.tokens.json --format shadcn` — export to shadcn/ui HSL variables
- `fetchtype build -i fetchtype.tokens.json --format all` — export all formats
- `fetchtype suggest -c interface` — font recommendations by context
- `fetchtype pair "Inter"` — pairing suggestions
- `fetchtype search "geometric sans" --variable` — search 1,929 fonts
- `fetchtype resolve Inter` — full font metadata and fallback CSS
- `fetchtype audit --dir src/` — scan existing CSS/HTML for typography issues

## Token schema

Typography has 12 contexts: heading, subheading, body, caption, button, label, input, code, blockquote, chart-label, chart-axis, chart-title. Color tokens define light and dark modes. Hierarchy sets the type scale (e.g. major-third) and heading sizes h1-h6.

## Export formats

CSS custom properties (`--ft-*`), Tailwind `theme.extend` config, shadcn/ui HSL variables, W3C Design Tokens format, resolved JSON.
