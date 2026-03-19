# Export formats

fetchtype exports validated tokens to five formats. Each produces framework-ready output files you can drop directly into your project.

```bash
# Export a single format
fetchtype build -i fetchtype.tokens.json --format tailwind

# Export all formats at once
fetchtype build -i fetchtype.tokens.json -o dist/tokens --format all
```

## Formats

### CSS custom properties

```bash
fetchtype build -i fetchtype.tokens.json --format css
```

Output: `tokens.css`

```css
:root {
  --ft-heading-font-size: 3rem;
  --ft-heading-line-height: 1.1;
  --ft-body-font-size: 1rem;
  --ft-body-line-height: 1.6;
  --ft-button-font-size: 0.9375rem;
  --ft-caption-font-size: 0.8125rem;
  --ft-color-text: #111827;
  --ft-color-background: #ffffff;
}
```

The `--ft-` prefix is configurable.

### Tailwind CSS

```bash
fetchtype build -i fetchtype.tokens.json --format tailwind
```

Output: `tailwind.config.ts`

Generates a `theme.extend` partial you can spread into your Tailwind config:

```ts
export default {
  fontSize: {
    heading: ['3rem', { lineHeight: '1.1' }],
    body: ['1rem', { lineHeight: '1.6' }],
    button: ['0.9375rem', { lineHeight: '1.4' }],
    caption: ['0.8125rem', { lineHeight: '1.4' }],
  },
  // ...
}
```

### shadcn/ui

```bash
fetchtype build -i fetchtype.tokens.json --format shadcn
```

Output: `shadcn.css`

Generates HSL CSS variables compatible with shadcn/ui's theming system. Drop it into your `globals.css`.

### JSON

```bash
fetchtype build -i fetchtype.tokens.json --format json
```

Output: `tokens.json`

Fully resolved token values — no references, no aliases, just final computed values. Useful for JavaScript/TypeScript consumption or as input to other tooling.

### W3C Design Tokens

```bash
fetchtype build -i fetchtype.tokens.json --format w3c
```

Output: `tokens.w3c.json`

Exports in the [W3C Design Tokens Community Group](https://design-tokens.github.io/community-group/format/) format for interoperability with other design token tools (Style Dictionary, Figma Tokens, etc.).

## Output directory

By default, files are written to the current directory. Use `--out-dir` to specify a target:

```bash
fetchtype build -i fetchtype.tokens.json --format all --out-dir dist/tokens
```

## Importing

fetchtype can also import W3C Design Tokens files into its own format:

```bash
fetchtype import -i tokens.w3c.json
```

This produces a `fetchtype.tokens.json` that you can then validate and export to other formats.
