# fetchtype + Next.js + Tailwind

Typography validation and token generation for a Next.js project using Tailwind CSS.

## Setup

```bash
pnpm add -D fetchtype
```

## Quick start

```bash
# Initialize from the base preset (or use --preset dashboard for data-heavy apps)
npx fetchtype init --preset base

# Validate your tokens
npx fetchtype validate -i fetchtype.tokens.json

# Export to Tailwind config
npx fetchtype build -i fetchtype.tokens.json --format tailwind -o tokens/
```

The generated `tokens/tailwind.config.ts` partial can be spread into your main Tailwind config:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import fetchtype from './tokens/tailwind.config';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...fetchtype.theme.extend,
    },
  },
} satisfies Config;
```

## Configuration

The `.fetchtype.json` in this directory shows a recommended config: strict contrast ratio enforcement and a font allowlist for Inter + JetBrains Mono.

## CI

Copy `../ci/github-actions-basic.yml` into your `.github/workflows/` directory for PR validation.
