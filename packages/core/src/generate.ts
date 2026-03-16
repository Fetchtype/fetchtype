import type { DesignTokenSet } from '@fetchtype/types';

import { DEFAULT_TOKEN_SET, getPreset } from './presets.js';
import { validateDesignTokenSet } from './index.js';

export type GenerateOptions = {
  context: string; // 'saas-dashboard', 'editorial', 'ecommerce', 'docs', 'marketing'
  brandColor?: string; // primary brand color hex
  maxFonts?: number; // max web fonts (default 2)
  budgetKb?: number; // font payload budget
  subsets?: string[]; // required subsets
  accessibility?: 'wcag-aa' | 'wcag-aaa'; // accessibility level
  preset?: string; // explicit preset name to use as base
};

export type GenerateResult = {
  tokenSet: DesignTokenSet;
  reasoning: string[]; // explain decisions made
  fonts: { primary: string; secondary: string; mono?: string };
  warnings: string[];
};

function mapContextToPreset(context: string): string {
  const contextMap: Record<string, string> = {
    saas: 'dashboard',
    'saas-dashboard': 'dashboard',
    dashboard: 'dashboard',
    admin: 'dashboard',
    app: 'dashboard',
    editorial: 'editorial',
    blog: 'editorial',
    magazine: 'editorial',
    news: 'editorial',
    ecommerce: 'ecommerce',
    shop: 'ecommerce',
    store: 'ecommerce',
    docs: 'docs',
    documentation: 'docs',
    api: 'docs',
    marketing: 'base',
    landing: 'base',
    corporate: 'base',
    // Design system presets
    material: 'material',
    carbon: 'carbon',
    fluent: 'fluent',
    radix: 'radix',
    spectrum: 'spectrum',
  };

  const key = context.toLowerCase().replace(/[\s_-]+/g, '-');
  return contextMap[key] ?? 'base';
}

function applyBrandColor(tokens: DesignTokenSet, hex: string): void {
  // Apply to accent colors in both light and dark modes
  tokens.color.light.text.accent = { value: hex, description: 'Brand accent' };
  tokens.color.light.background.accent = { value: hex, description: 'Brand accent bg' };
  tokens.color.light.interactive.default = { value: hex, description: 'Brand interactive' };
  // Dark mode: same color (could be lightened but keep it simple)
  tokens.color.dark.text.accent = { value: hex, description: 'Brand accent' };
  tokens.color.dark.background.accent = { value: hex, description: 'Brand accent bg' };
  tokens.color.dark.interactive.default = { value: hex, description: 'Brand interactive' };
}

function extractFontFamily(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? 'system-ui';
  }
  // fontFamily may be a comma-separated stack like "Inter, sans-serif"
  return value.split(',')[0]?.trim() ?? 'system-ui';
}

function extractPrimaryFont(tokens: DesignTokenSet): string {
  const body = tokens.typography['body'];
  if (body) {
    return extractFontFamily(body.fontFamily);
  }
  // Fallback: first typography context
  const first = Object.values(tokens.typography)[0];
  if (first) {
    return extractFontFamily(first.fontFamily);
  }
  return 'system-ui';
}

function extractSecondaryFont(tokens: DesignTokenSet): string {
  const heading = tokens.typography['heading'];

  if (heading) {
    const headingFamily = extractFontFamily(heading.fontFamily);
    const bodyFamily = extractPrimaryFont(tokens);
    // Only return heading font as secondary if it differs from body
    if (headingFamily !== bodyFamily) {
      return headingFamily;
    }
  }

  // Fallback: look for code context
  const code = tokens.typography['code'];
  if (code) {
    const codeFamily = extractFontFamily(code.fontFamily);
    const bodyFamily = extractPrimaryFont(tokens);
    if (codeFamily !== bodyFamily) {
      return codeFamily;
    }
  }

  // All contexts use the same font — return it again
  return extractPrimaryFont(tokens);
}

function extractMonoFont(tokens: DesignTokenSet): string | undefined {
  const code = tokens.typography['code'];
  if (!code) return undefined;
  const family = extractFontFamily(code.fontFamily);
  const primary = extractPrimaryFont(tokens);
  return family !== primary ? family : undefined;
}

export function generateTokenSet(options: GenerateOptions): GenerateResult {
  const reasoning: string[] = [];
  const warnings: string[] = [];

  // 1. Select base preset from context keyword
  const presetName = options.preset ?? mapContextToPreset(options.context);
  const baseTokens = structuredClone(getPreset(presetName) ?? DEFAULT_TOKEN_SET);
  reasoning.push(`Base preset: ${presetName}`);

  // 2. If brandColor provided, apply it to the token set
  if (options.brandColor) {
    applyBrandColor(baseTokens, options.brandColor);
    reasoning.push(`Applied brand color: ${options.brandColor}`);
  }

  // 3. Note accessibility level if specified
  if (options.accessibility) {
    reasoning.push(`Accessibility target: ${options.accessibility}`);
  }

  // 4. Note font budget constraints if specified
  if (options.maxFonts !== undefined) {
    reasoning.push(`Max fonts: ${options.maxFonts}`);
  }
  if (options.budgetKb !== undefined) {
    reasoning.push(`Font budget: ${options.budgetKb}kb`);
  }
  if (options.subsets && options.subsets.length > 0) {
    reasoning.push(`Required subsets: ${options.subsets.join(', ')}`);
  }

  // 5. Validate the token set
  const report = validateDesignTokenSet(baseTokens);
  if (!report.pass) {
    warnings.push(
      ...report.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => d.message),
    );
  }

  // 6. Extract font info from the token set
  const primaryFont = extractPrimaryFont(baseTokens);
  const secondaryFont = extractSecondaryFont(baseTokens);
  const monoFont = extractMonoFont(baseTokens);

  const fonts: GenerateResult['fonts'] = { primary: primaryFont, secondary: secondaryFont };
  if (monoFont) {
    fonts.mono = monoFont;
  }

  return {
    tokenSet: baseTokens,
    reasoning,
    fonts,
    warnings,
  };
}
