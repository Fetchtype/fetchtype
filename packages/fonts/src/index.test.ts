import { describe, expect, it } from 'vitest';

import {
  buildGoogleFontsStylesheetUrl,
  buildSelfHostedAssets,
  generateFontFaceCss,
  resolveFontReference,
} from './index.js';

describe('buildGoogleFontsStylesheetUrl', () => {
  it('builds a Google Fonts css2 URL', () => {
    const url = buildGoogleFontsStylesheetUrl('Inter Tight', {
      display: 'swap',
      weights: [400, 700],
    });

    expect(url).toContain('https://fonts.googleapis.com/css2');
    expect(url).toContain('family=Inter%2BTight%3Awght%40400%3B700');
    expect(url).toContain('display=swap');
  });
});

describe('buildSelfHostedAssets', () => {
  it('builds predictable self-hosted asset URLs', () => {
    const assets = buildSelfHostedAssets(
      {
        family: 'Inter Tight',
        variable: false,
      },
      {
        basePath: '/static/fonts',
        weights: [400, 600],
      },
    );

    expect(assets).toHaveLength(2);
    expect(assets[0]?.url).toBe('/static/fonts/inter-tight-400.woff2');
    expect(assets[1]?.url).toBe('/static/fonts/inter-tight-600.woff2');
  });
});

describe('resolveFontReference', () => {
  it('returns Google Fonts metadata for google references', () => {
    const resolution = resolveFontReference({
      family: 'Inter Tight',
      source: 'google',
      variable: true,
      category: 'sans-serif',
    });

    expect(resolution.stylesheetUrl).toContain('fonts.googleapis.com');
    expect(resolution.preloadHints).toHaveLength(1);
  });

  it('returns assets and @font-face CSS for self-hosted references', () => {
    const reference = {
      family: 'Inter Tight',
      source: 'self-hosted' as const,
      variable: false,
      category: 'sans-serif' as const,
    };
    const resolution = resolveFontReference(reference, {
      basePath: '/fonts',
      weights: [400],
    });

    expect(resolution.assets[0]?.url).toBe('/fonts/inter-tight-400.woff2');
    expect(resolution.fontFaceCss).toContain('@font-face');
    expect(generateFontFaceCss(reference, resolution.assets)).toContain(
      'font-family: "Inter Tight"',
    );
  });
});
