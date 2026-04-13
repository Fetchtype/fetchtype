# fetchtype + Astro + shadcn/ui

Typography validation and token generation for an Astro content site using shadcn/ui components.

## Setup

```bash
pnpm add -D fetchtype
```

## Quick start

```bash
# Initialize from the editorial preset (optimized for reading: larger body, generous line-height)
npx fetchtype init --preset editorial

# Validate your tokens
npx fetchtype validate -i fetchtype.tokens.json

# Export to shadcn CSS variables
npx fetchtype build -i fetchtype.tokens.json --format shadcn -o tokens/
```

Import the generated CSS into your Astro layout:

```astro
---
// src/layouts/Base.astro
import '../tokens/shadcn.css';
---
```

## Audit existing typography

If you already have an Astro site with typography in CSS/Tailwind, scan it:

```bash
npx fetchtype audit --dir src/
```

This detects inconsistent font stacks, missing fallbacks, and accessibility issues across your existing styles.

## Configuration

The `.fetchtype.json` in this directory uses the `strict` profile, which enforces WCAG AAA contrast and tighter validation rules. Good for polished content sites.

## CI

Copy `../ci/github-actions-basic.yml` into your `.github/workflows/` directory for PR validation.
