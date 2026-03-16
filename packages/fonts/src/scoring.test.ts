import { describe, it, expect } from 'vitest';
import { computeContextScores } from './scoring.js';
import type { FontEntry } from '@fetchtype/types';

// Minimal FontEntry factory to keep tests concise
function makeFont(overrides: Partial<FontEntry>): FontEntry {
  const base: FontEntry = {
    id: 'test-font',
    family: 'Test Font',
    version: 'v1',
    source: 'google',
    lastUpdated: '2026-01-01',
    category: 'sans-serif',
    tags: [],
    contexts: [],
    variable: false,
    axes: [],
    weights: [400],
    styles: ['normal'],
    subsets: ['latin'],
    formats: ['woff2'],
    hasItalic: false,
    hasOpticalSizing: false,
    performance: {
      woff2Size: { latin: 20000 },
      variableFileSize: null,
      estimatedPayload: 20000,
      loadingImpact: 'minimal',
    },
    metrics: {
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      xHeight: 530,
      capHeight: 700,
      useTypoMetrics: false,
      hheaAscent: null,
      hheaDescent: null,
      winAscent: null,
      winDescent: null,
    },
    fallback: {
      targets: [],
      requiresPlatformSplit: false,
      generatedCSS: '',
    },
    pairing: { recommended: [] },
    license: {
      type: 'OFL',
      url: 'https://example.com',
      commercial: true,
      selfHostable: true,
      attribution: null,
    },
    install: {
      fontsource: null,
      googleCdn: null,
      npmPackage: null,
      system: null,
    },
  };
  return { ...base, ...overrides } as FontEntry;
}

describe('computeContextScores', () => {
  it('returns all 6 context keys', () => {
    const scores = computeContextScores(makeFont({}));
    const keys = Object.keys(scores).sort();
    expect(keys).toEqual(['data', 'display', 'editorial', 'interface', 'mono', 'reading']);
  });

  it('all scores are between 0 and 1 (inclusive)', () => {
    const fonts = [
      makeFont({ category: 'sans-serif' }),
      makeFont({ category: 'serif' }),
      makeFont({ category: 'monospace' }),
      makeFont({ category: 'display' }),
      makeFont({ category: 'handwriting' }),
    ];
    for (const font of fonts) {
      const scores = computeContextScores(font);
      for (const [ctx, score] of Object.entries(scores)) {
        expect(score, `${ctx} score out of range for ${font.category}`).toBeGreaterThanOrEqual(0);
        expect(score, `${ctx} score out of range for ${font.category}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('monospace font scores high for mono (>=0.6)', () => {
    const font = makeFont({ category: 'monospace' });
    const scores = computeContextScores(font);
    expect(scores.mono).toBeGreaterThanOrEqual(0.6);
  });

  it('monospace font with ligatures tag scores higher for mono', () => {
    const base = makeFont({ category: 'monospace' });
    const withLigatures = makeFont({ category: 'monospace', tags: ['ligatures'] });
    const baseScores = computeContextScores(base);
    const ligScores = computeContextScores(withLigatures);
    expect(ligScores.mono).toBeGreaterThan(baseScores.mono);
  });

  it('non-monospace font scores 0 for mono', () => {
    const font = makeFont({ category: 'sans-serif' });
    const scores = computeContextScores(font);
    expect(scores.mono).toBe(0);
  });

  it('sans-serif font scores high for interface (>0.4)', () => {
    const font = makeFont({
      category: 'sans-serif',
      weights: [100, 300, 400, 500, 700],
    });
    const scores = computeContextScores(font);
    expect(scores.interface).toBeGreaterThan(0.4);
  });

  it('sans-serif font scores higher for interface than a serif font', () => {
    const sans = makeFont({ category: 'sans-serif', weights: [100, 300, 400, 500, 700] });
    const serif = makeFont({ category: 'serif', weights: [400, 700] });
    const sansScores = computeContextScores(sans);
    const serifScores = computeContextScores(serif);
    expect(sansScores.interface).toBeGreaterThan(serifScores.interface);
  });

  it('serif font scores high for reading (>0.4)', () => {
    const font = makeFont({
      category: 'serif',
      hasItalic: true,
      weights: [300, 400, 700],
    });
    const scores = computeContextScores(font);
    expect(scores.reading).toBeGreaterThan(0.4);
  });

  it('display font scores high for display (>=0.4)', () => {
    const font = makeFont({ category: 'display', weights: [700] });
    const scores = computeContextScores(font);
    expect(scores.display).toBeGreaterThanOrEqual(0.4);
  });

  it('variable font with wght axis scores higher for display than non-variable', () => {
    const nonVariable = makeFont({ category: 'serif', variable: false, axes: [], weights: [400, 700] });
    const variable = makeFont({
      category: 'serif',
      variable: true,
      axes: [{ tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, step: 1, cssProperty: 'font-weight' }],
      weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    });
    const nvScores = computeContextScores(nonVariable);
    const vScores = computeContextScores(variable);
    expect(vScores.display).toBeGreaterThan(nvScores.display);
  });

  it('optical sizing axis increases editorial and reading scores', () => {
    const noOpsz = makeFont({ category: 'serif', hasItalic: true });
    const withOpsz = makeFont({
      category: 'serif',
      hasItalic: true,
      hasOpticalSizing: true,
      axes: [{ tag: 'opsz', name: 'Optical Size', min: 6, max: 144, default: 14, step: 1, cssProperty: null }],
    });
    const noScores = computeContextScores(noOpsz);
    const withScores = computeContextScores(withOpsz);
    expect(withScores.reading).toBeGreaterThan(noScores.reading);
    expect(withScores.editorial).toBeGreaterThan(noScores.editorial);
  });

  it('scores do not exceed 1.0 for heavily optimised fonts', () => {
    const font = makeFont({
      category: 'sans-serif',
      variable: true,
      weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
      hasItalic: true,
      hasOpticalSizing: true,
      axes: [
        { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, step: 1, cssProperty: 'font-weight' },
        { tag: 'opsz', name: 'Optical Size', min: 6, max: 144, default: 14, step: 1, cssProperty: null },
        { tag: 'wdth', name: 'Width', min: 75, max: 125, default: 100, step: 1, cssProperty: null },
      ],
      subsets: ['latin', 'latin-ext', 'cyrillic', 'greek', 'vietnamese'],
      tags: ['geometric', 'clean', 'neutral', 'elegant', 'humanist', 'tabular'],
      performance: {
        woff2Size: { latin: 5000 },
        variableFileSize: 80000,
        estimatedPayload: 5000,
        loadingImpact: 'minimal',
      },
    });
    const scores = computeContextScores(font);
    for (const [ctx, score] of Object.entries(scores)) {
      expect(score, `${ctx} exceeds 1.0`).toBeLessThanOrEqual(1.0);
    }
  });
});
