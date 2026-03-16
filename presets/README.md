# Presets

The base preset source of truth lives in
`packages/core/src/base.tokens.json`.

Why it lives there:

- `@fetchtype/core` imports it directly for runtime use
- `fetchtype init` writes from that same artifact
- docs and examples can point at one canonical preset instead of keeping a duplicate copy

Use the source preset directly when you need a checked-in example:

```bash
node packages/cli/dist/bin.js validate --input packages/core/src/base.tokens.json
```
