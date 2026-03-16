import type { FontAsset, FontReference } from '@fetchtype/types';

export { GOOGLE_FONTS_CATALOG, lookupFont, searchFonts, type CatalogEntry } from './catalog.js';
export { suggestFonts, type FontSuggestion, type SuggestionContext } from './suggest.js';
export {
  loadRegistry,
  registryStats,
  resolveFont,
  hasFont,
  searchRegistry,
  suggestFromRegistry,
  getPairings,
  type RegistrySearchOptions,
  type RegistrySuggestOptions,
} from './registry.js';
export { recommendPairings, resolvePairings } from './pairing.js';
export { computeContextScores, type ContextScores, type TypographicContext } from './scoring.js';
export { computeSizeGuidance, type SizeGuidance } from './size-guidance.js';

export const SYSTEM_FONT_STACKS = {
  'sans-serif': ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  serif: ['Iowan Old Style', 'Georgia', 'Times New Roman', 'serif'],
  monospace: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  display: ['Avenir Next', 'Segoe UI', 'sans-serif'],
  handwriting: ['Segoe Print', 'Bradley Hand', 'cursive'],
} as const;

function quoteFontFamily(family: string): string {
  return /\s/.test(family) && !family.startsWith('"') ? `"${family}"` : family;
}

function slugifyFamily(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

export type FontResolution = {
  source: FontReference['source'];
  stylesheetUrl?: string;
  assets: FontAsset[];
  fontFaceCss?: string;
  preloadHints: string[];
};

export type GoogleFontOptions = {
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  weights?: number[];
};

export type SelfHostedFontOptions = {
  basePath?: string;
  weights?: number[];
};

export function resolveFontStack(
  reference: Pick<FontReference, 'family' | 'fallbacks' | 'category'>,
): string[] {
  const category = reference.category ?? 'sans-serif';
  const fallbacks = reference.fallbacks?.length
    ? reference.fallbacks
    : [...SYSTEM_FONT_STACKS[category]];

  return [quoteFontFamily(reference.family), ...fallbacks.map(quoteFontFamily)];
}

export function stringifyFontStack(
  reference: Pick<FontReference, 'family' | 'fallbacks' | 'category'>,
): string {
  return resolveFontStack(reference).join(', ');
}

export function buildGoogleFontsStylesheetUrl(
  family: string,
  options: GoogleFontOptions = {},
): string {
  const url = new URL('https://fonts.googleapis.com/css2');
  const formattedFamily = family.trim().split(/\s+/).join('+');
  const weights = options.weights?.length
    ? [...new Set(options.weights)].sort((a, b) => a - b)
    : [];
  const familyParam = weights.length
    ? `${formattedFamily}:wght@${weights.join(';')}`
    : formattedFamily;

  url.searchParams.set('family', familyParam);
  url.searchParams.set('display', options.display ?? 'swap');

  return url.toString();
}

export function buildSelfHostedAssets(
  reference: Pick<FontReference, 'family' | 'variable'>,
  options: SelfHostedFontOptions = {},
): FontAsset[] {
  const basePath = options.basePath ?? '/fonts';
  const slug = slugifyFamily(reference.family);
  const weights = options.weights?.length
    ? [...new Set(options.weights)].sort((a, b) => a - b)
    : [400];

  if (reference.variable) {
    return [
      {
        family: reference.family,
        style: 'normal',
        format: 'variable',
        url: `${basePath}/${slug}-variable.woff2`,
      },
    ];
  }

  return weights.map((weight) => ({
    family: reference.family,
    weight,
    style: 'normal',
    format: 'woff2',
    url: `${basePath}/${slug}-${weight}.woff2`,
  }));
}

export function generateFontFaceCss(reference: FontReference, assets: FontAsset[]): string {
  return assets
    .map((asset) => {
      const lines = [
        '@font-face {',
        `  font-family: ${quoteFontFamily(reference.family)};`,
        `  src: url("${asset.url}") format("${asset.format === 'variable' ? 'woff2-variations' : asset.format}");`,
      ];

      if (asset.weight) {
        lines.push(`  font-weight: ${asset.weight};`);
      } else if (reference.variable) {
        lines.push('  font-weight: 1 1000;');
      }

      lines.push(`  font-style: ${asset.style ?? 'normal'};`);
      lines.push('  font-display: swap;');

      if (asset.unicodeRange) {
        lines.push(`  unicode-range: ${asset.unicodeRange};`);
      }

      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
}

export function resolveFontReference(
  reference: FontReference,
  options: GoogleFontOptions & SelfHostedFontOptions = {},
): FontResolution {
  if (reference.source === 'google') {
    const stylesheetUrl = buildGoogleFontsStylesheetUrl(reference.family, options);

    return {
      source: reference.source,
      stylesheetUrl,
      assets: [],
      preloadHints: [stylesheetUrl],
    };
  }

  if (reference.source === 'self-hosted') {
    const assets = buildSelfHostedAssets(reference, options);

    return {
      source: reference.source,
      assets,
      fontFaceCss: generateFontFaceCss(reference, assets),
      preloadHints: assets.map((asset) => asset.url),
    };
  }

  return {
    source: reference.source,
    assets: [],
    preloadHints: [],
  };
}
