# Validation rules

fetchtype checks 20 rules covering accessibility, readability, font loading, and structural consistency. Every rule has a default threshold, a severity level, and can be configured in `.fetchtype.json`.

## Rules reference

| # | Rule ID | What it checks | Default threshold | Severity |
|---|---------|---------------|-------------------|----------|
| 1 | `contrast.ratio` | Text color against background | ≥ 4.5:1 (WCAG AA) | error |
| 2 | `body.line-height` | Paragraph spacing for readability | ≥ 1.5 | error |
| 3 | `button.font-size` | Tap target legibility | ≥ 14px | error |
| 4 | `caption.font-size` | Small text legibility | ≥ 11px | warn |
| 5 | `prose.width` | Line length for comfortable reading | ≤ 75ch | warn |
| 6 | `heading.direction` | Heading scale flows h1 → h6 | Monotonically decreasing | error |
| 7 | `heading.line-height` | Headings tighter than body | < body line-height | warn |
| 8 | `spacing.scale` | Spacing ramp is consistent | Monotonically increasing | warn |
| 9 | `scale.divergence` | Actual sizes match computed type scale | Within ±10% | warn |
| 10 | `dark-mode.completeness` | All themes have complete coverage | All modes covered | error |
| 11 | `font.fallback` | System fallback chain present | Generic fallback exists | error |
| 12 | `font.payload` | Total web font download size | ≤ 150 KB | warn |
| 13 | `token.references` | Alias tokens resolve correctly | No circular references | error |
| 14 | `font.weight` | Requested weight exists in font file | Weight available | error |
| 15 | `font.axis-range` | Variable font axis values in bounds | Within axis min/max | error |
| 16 | `font.subset` | Required character sets present | Subsets available | warn |
| 17 | `font.display` | Font loading strategy | Not `auto` (prefer `swap`) | warn |
| 18 | `font.preload-count` | Number of preloaded web fonts | ≤ 4 | warn |
| 19 | `fluid.type` | `clamp()` values correctly ordered | min < max, body ≥ 12px | error |
| 20 | `font.policy` | Allow/block list enforcement | Per-config rules | error |

## Configuring rules

Override any rule's severity or threshold in `.fetchtype.json`:

```json
{
  "extends": "fetchtype:recommended",
  "rules": {
    "contrast.ratio": { "severity": "error", "threshold": 7 },
    "font.payload": { "severity": "error", "max": 100 },
    "caption.font-size": { "severity": "off" }
  }
}
```

### Severity levels

| Level | Behavior |
|-------|----------|
| `error` | Fails validation, exits with code 1 |
| `warn` | Reported but doesn't fail validation |
| `off` | Rule is skipped entirely |

## Built-in profiles

| Profile | Description |
|---------|-------------|
| `fetchtype:recommended` | Sensible defaults — errors for accessibility, warnings for best practices |
| `fetchtype:strict` | All warnings promoted to errors |
| `fetchtype:accessibility` | WCAG AAA enforcement — 7:1 contrast, stricter sizing minimums |

## Sharing configs

Package your config as an npm module and reference it:

```json
{
  "extends": "@myorg/fetchtype-config"
}
```

The package just needs to export a valid `.fetchtype.json` shape.
