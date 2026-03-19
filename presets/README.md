# Presets

fetchtype ships with presets — complete token files tuned for specific use cases.

```bash
# List all available presets
fetchtype init --list

# Generate tokens from a preset
fetchtype init --preset dashboard
```

## Available presets

| Preset | Use case |
|--------|----------|
| `base` | General-purpose defaults |
| `editorial` | Long-form reading — larger body, generous line-height, serif stacks, 65ch prose |
| `dashboard` | Data-dense interfaces — compact body, tighter line-height, monospace, wider content |
| `ecommerce` | Product pages and conversion flows |
| `docs` | Documentation and knowledge bases |
| `carbon` | IBM Carbon Design System alignment |
| `fluent` | Microsoft Fluent Design System alignment |
| `material` | Google Material Design 3 alignment |
| `radix` | Radix UI alignment |
| `spectrum` | Adobe Spectrum Design System alignment |

## Source files

The canonical preset definitions live in `packages/core/src/`:

- `base.tokens.json`
- `editorial.tokens.json`
- `dashboard.tokens.json`
- `ecommerce.tokens.json`
- `docs.tokens.json`
- `carbon.tokens.json`
- `fluent.tokens.json`
- `material.tokens.json`
- `radix.tokens.json`
- `spectrum.tokens.json`

Each preset is a complete, valid token file that passes all 20 validation rules out of the box.
