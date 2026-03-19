# Configuration

fetchtype works with zero configuration — `fetchtype:recommended` is applied by default. To customize rules, enforce font policies, or share config across repos, create a `.fetchtype.json` file in your project root.

## Full example

```json
{
  "extends": "fetchtype:recommended",
  "rules": {
    "contrast.ratio": { "severity": "error", "threshold": 7 },
    "font.preload-count": { "severity": "warn", "max": 3 },
    "font.payload": { "severity": "error", "max": 100 },
    "caption.font-size": { "severity": "off" }
  },
  "fonts": {
    "allow": ["Inter", "JetBrains Mono", "Source Serif 4"],
    "block": [
      { "family": "Comic Sans MS", "reason": "Brand guidelines" },
      { "family": "Papyrus", "reason": "Brand guidelines" }
    ]
  },
  "performance": {
    "budget": 120
  }
}
```

## Config fields

### `extends`

Base profile to inherit from. Your rules override the base.

| Profile | Description |
|---------|-------------|
| `fetchtype:recommended` | Default — errors for accessibility, warnings for best practices |
| `fetchtype:strict` | All warnings promoted to errors |
| `fetchtype:accessibility` | WCAG AAA — 7:1 contrast, stricter sizing |

### `rules`

Override individual rule severity or thresholds. See [validation-rules.md](validation-rules.md) for the full list.

```json
{
  "rules": {
    "contrast.ratio": { "severity": "error", "threshold": 7 },
    "font.payload": { "severity": "off" }
  }
}
```

### `fonts`

Font allow/block lists for policy enforcement.

```json
{
  "fonts": {
    "allow": ["Inter", "JetBrains Mono"],
    "block": [{ "family": "Comic Sans MS", "reason": "Brand guidelines" }]
  }
}
```

- If `allow` is set, only listed fonts pass validation.
- `block` entries fail validation with the given reason.
- Both can be used together — `allow` takes precedence.

### `performance`

Font performance budget in kilobytes.

```json
{
  "performance": {
    "budget": 120
  }
}
```

## Config resolution

fetchtype looks for configuration in this order:

1. `.fetchtype.json` in the current directory
2. `.fetchtype.json` in parent directories (up to project root)
3. `fetchtype` key in `package.json`
4. Falls back to `fetchtype:recommended`

## Shareable configs

Package your config as an npm module:

```json
{
  "name": "@myorg/fetchtype-config",
  "main": ".fetchtype.json"
}
```

Then reference it:

```json
{
  "extends": "@myorg/fetchtype-config"
}
```
