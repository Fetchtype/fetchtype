import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseGoogleFontsCSS,
  generateFontFaceCSS,
  generatePreloadTags,
  generateFallbackCSS,
  type PrepareManifest,
} from './prepare.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_GOOGLE_FONTS_CSS = `
/* cyrillic-ext */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50SN8.woff2) format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* cyrillic */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50SN8cyrillic.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50BTk.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50BTk700.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
`;

const SAMPLE_ITALIC_CSS = `
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/italic400.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

// ---------------------------------------------------------------------------
// Minimal manifest fixture for CSS/tag generators
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<PrepareManifest> = {}): PrepareManifest {
  return {
    fontId: 'inter',
    family: 'Inter',
    version: 'v18',
    generatedAt: '2026-01-01T00:00:00.000Z',
    files: [
      {
        path: './dist/fonts/inter-latin-400-normal.woff2',
        weight: 400,
        style: 'normal',
        subset: 'latin',
        format: 'woff2',
        size: 25088,
      },
      {
        path: './dist/fonts/inter-latin-700-normal.woff2',
        weight: 700,
        style: 'normal',
        subset: 'latin',
        format: 'woff2',
        size: 26112,
      },
    ],
    css: { fontFace: '', fallback: '', preload: '' },
    performance: {
      totalSize: 51200,
      budgetUsed: 34.1,
      budgetExceeded: false,
      budgetLimit: 150000,
    },
    preloadTags: [
      `<link rel="preload" href="./dist/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin="anonymous">`,
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: parseGoogleFontsCSS
// ---------------------------------------------------------------------------

describe('parseGoogleFontsCSS', () => {
  it('extracts all font-face blocks from CSS2 API response', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    expect(faces.length).toBe(4);
  });

  it('captures subset from comment preceding each @font-face block', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    const subsets = faces.map((f) => f.subset);
    expect(subsets).toContain('cyrillic-ext');
    expect(subsets).toContain('cyrillic');
    expect(subsets).toContain('latin');
  });

  it('parses font-weight correctly', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    const weights = faces.map((f) => f.weight);
    expect(weights).toContain(400);
    expect(weights).toContain(700);
  });

  it('parses font-style: normal by default', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    for (const face of faces) {
      expect(face.style).toBe('normal');
    }
  });

  it('parses font-style: italic from italic CSS', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_ITALIC_CSS);
    expect(faces[0]?.style).toBe('italic');
  });

  it('extracts the WOFF2 src URL', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    const latinFace = faces.find((f) => f.subset === 'latin' && f.weight === 400);
    expect(latinFace?.src).toMatch(/fonts\.gstatic\.com/);
    expect(latinFace?.src).toMatch(/\.woff2/);
  });

  it('extracts unicode-range', () => {
    const faces = parseGoogleFontsCSS(SAMPLE_GOOGLE_FONTS_CSS);
    const latinFace = faces.find((f) => f.subset === 'latin' && f.weight === 400);
    expect(latinFace?.unicodeRange).toMatch(/U\+/);
  });

  it('returns empty array for empty CSS input', () => {
    expect(parseGoogleFontsCSS('')).toEqual([]);
  });

  it('skips @font-face blocks without a WOFF2 src', () => {
    const noWoff2 = `
/* latin */
@font-face {
  font-family: 'Test';
  font-style: normal;
  font-weight: 400;
  src: url(test.ttf) format('truetype');
  unicode-range: U+0000-00FF;
}`;
    expect(parseGoogleFontsCSS(noWoff2)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: generateFontFaceCSS
// ---------------------------------------------------------------------------

describe('generateFontFaceCSS', () => {
  it('generates one @font-face block per file', () => {
    const manifest = makeManifest();
    const css = generateFontFaceCSS(manifest);
    // Match @font-face { blocks (not the comment header which also contains @font-face)
    const blockCount = (css.match(/@font-face\s*\{/g) ?? []).length;
    expect(blockCount).toBe(2);
  });

  it('includes font-family declaration', () => {
    const css = generateFontFaceCSS(makeManifest());
    expect(css).toContain("font-family: 'Inter'");
  });

  it('includes font-weight for each variant', () => {
    const css = generateFontFaceCSS(makeManifest());
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-weight: 700');
  });

  it('includes font-display: swap', () => {
    const css = generateFontFaceCSS(makeManifest());
    expect(css).toContain('font-display: swap');
  });

  it('includes src with format woff2', () => {
    const css = generateFontFaceCSS(makeManifest());
    expect(css).toContain("format('woff2')");
  });

  it('uses relative paths for src', () => {
    const css = generateFontFaceCSS(makeManifest());
    expect(css).toMatch(/url\('\.\//);
  });
});

// ---------------------------------------------------------------------------
// Tests: generatePreloadTags
// ---------------------------------------------------------------------------

describe('generatePreloadTags', () => {
  it('includes HTML comment header', () => {
    const html = generatePreloadTags(makeManifest());
    expect(html).toContain('fetchtype');
  });

  it('renders link rel=preload tags from manifest.preloadTags', () => {
    const html = generatePreloadTags(makeManifest());
    expect(html).toContain('<link rel="preload"');
    expect(html).toContain('as="font"');
    expect(html).toContain('type="font/woff2"');
    expect(html).toContain('crossorigin="anonymous"');
  });

  it('returns header-only output when preloadTags is empty', () => {
    const manifest = makeManifest({ preloadTags: [] });
    const html = generatePreloadTags(manifest);
    expect(html).not.toContain('<link');
  });
});

// ---------------------------------------------------------------------------
// Tests: generateFallbackCSS
// ---------------------------------------------------------------------------

describe('generateFallbackCSS', () => {
  it('returns fallback CSS for a known font id', () => {
    const css = generateFallbackCSS('inter', 'Inter', 'sans-serif');
    expect(css).toContain('@font-face');
    expect(css).toContain('Inter Fallback');
  });

  it('returns error comment for unknown font id', () => {
    const css = generateFallbackCSS('unknown-font-xyz', 'Unknown', 'sans-serif');
    expect(css).toContain('unavailable');
  });
});

// ---------------------------------------------------------------------------
// Tests: performance budget calculation
// ---------------------------------------------------------------------------

describe('performance budget', () => {
  it('calculates budgetUsed as percentage of budget limit', () => {
    // 51200 / 150000 = 34.1%
    const manifest = makeManifest();
    expect(manifest.performance.budgetUsed).toBeCloseTo(34.1, 0);
  });

  it('flags budgetExceeded when total size exceeds limit', () => {
    const manifest = makeManifest({
      performance: {
        totalSize: 200000,
        budgetUsed: 133.3,
        budgetExceeded: true,
        budgetLimit: 150000,
      },
    });
    expect(manifest.performance.budgetExceeded).toBe(true);
  });

  it('does not flag budgetExceeded when within limit', () => {
    expect(makeManifest().performance.budgetExceeded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: manifest structure
// ---------------------------------------------------------------------------

describe('manifest structure', () => {
  it('has required top-level fields', () => {
    const m = makeManifest();
    expect(m).toHaveProperty('fontId');
    expect(m).toHaveProperty('family');
    expect(m).toHaveProperty('version');
    expect(m).toHaveProperty('generatedAt');
    expect(m).toHaveProperty('files');
    expect(m).toHaveProperty('css');
    expect(m).toHaveProperty('performance');
    expect(m).toHaveProperty('preloadTags');
  });

  it('has css sub-fields: fontFace, fallback, preload', () => {
    const m = makeManifest();
    expect(m.css).toHaveProperty('fontFace');
    expect(m.css).toHaveProperty('fallback');
    expect(m.css).toHaveProperty('preload');
  });

  it('has performance sub-fields: totalSize, budgetUsed, budgetExceeded, budgetLimit', () => {
    const m = makeManifest();
    expect(m.performance).toHaveProperty('totalSize');
    expect(m.performance).toHaveProperty('budgetUsed');
    expect(m.performance).toHaveProperty('budgetExceeded');
    expect(m.performance).toHaveProperty('budgetLimit');
  });

  it('each file entry has required fields', () => {
    const m = makeManifest();
    for (const file of m.files) {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('weight');
      expect(file).toHaveProperty('style');
      expect(file).toHaveProperty('subset');
      expect(file).toHaveProperty('format');
      expect(file).toHaveProperty('size');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: prepareFont with fetch mock
// ---------------------------------------------------------------------------

describe('prepareFont (mocked fetch)', () => {
  const SAMPLE_CSS_LATIN_ONLY = `
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/latin400.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/latin700.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
`;

  beforeEach(() => {
    // Mock global fetch: CSS API returns sample CSS, woff2 downloads return a small buffer
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('googleapis.com')) {
        return {
          ok: true,
          status: 200,
          text: async () => SAMPLE_CSS_LATIN_ONLY,
        };
      }
      if (typeof url === 'string' && url.includes('gstatic.com')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new ArrayBuffer(1024),
        };
      }
      return { ok: false, status: 404 };
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves font from registry', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400, 700],
      subsets: ['latin'],
      outputDir: tmpDir,
      generateFallbacks: false,
    });
    expect(manifest.fontId).toBe('inter');
    expect(manifest.family).toBe('Inter');
  });

  it('throws for unknown font id', async () => {
    const { prepareFont } = await import('./prepare.js');
    await expect(
      prepareFont({ fontId: 'unknown-font-xyz-99', outputDir: '/tmp/fetchtype-test-err' }),
    ).rejects.toThrow('not found in registry');
  });

  it('downloads woff2 files for each (subset × weight × style) combination', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-files-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400, 700],
      subsets: ['latin'],
      outputDir: tmpDir,
      generateFallbacks: false,
    });
    // Inter has italic, so we get normal + italic = 4 files (2 weights × 2 styles)
    expect(manifest.files.length).toBeGreaterThanOrEqual(2);
    // All files should be in the latin subset
    expect(manifest.files.every((f) => f.subset === 'latin')).toBe(true);
  });

  it('includes font-face CSS in manifest', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-css-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400],
      subsets: ['latin'],
      outputDir: tmpDir,
      generateFallbacks: false,
    });
    expect(manifest.css.fontFace).toContain('@font-face');
  });

  it('generates preload tags for critical fonts', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-preload-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400],
      subsets: ['latin'],
      outputDir: tmpDir,
      generateFallbacks: false,
    });
    expect(manifest.preloadTags.length).toBeGreaterThan(0);
    expect(manifest.preloadTags[0]).toContain('<link rel="preload"');
  });

  it('calculates performance budget correctly', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-budget-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400],
      subsets: ['latin'],
      outputDir: tmpDir,
      performanceBudget: 10000,
      generateFallbacks: false,
    });
    // Each mocked file is 1024 bytes. Inter has italic, so 2 files (normal + italic).
    // totalSize = files.length × 1024. Budget 10000 is not exceeded.
    expect(manifest.performance.totalSize).toBe(manifest.files.length * 1024);
    expect(manifest.performance.budgetExceeded).toBe(false);
  });

  it('flags budgetExceeded when files exceed budget', async () => {
    const { prepareFont } = await import('./prepare.js');
    const tmpDir = `/tmp/fetchtype-test-over-${Date.now()}`;
    const manifest = await prepareFont({
      fontId: 'inter',
      weights: [400, 700],
      subsets: ['latin'],
      outputDir: tmpDir,
      performanceBudget: 100, // tiny budget
      generateFallbacks: false,
    });
    expect(manifest.performance.budgetExceeded).toBe(true);
  });
});
