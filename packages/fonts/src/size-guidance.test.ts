import { describe, it, expect } from 'vitest';
import { computeSizeGuidance } from './size-guidance.js';
import type { FontEntry } from '@fetchtype/types';

// Minimal FontEntry factory
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

describe('computeSizeGuidance', () => {
  it('serif font gets reasonable body range (14-20)', () => {
    const font = makeFont({ category: 'serif' });
    const guidance = computeSizeGuidance(font);
    expect(guidance.body.min).toBeGreaterThanOrEqual(14);
    expect(guidance.body.min).toBeLessThanOrEqual(16);
    expect(guidance.body.max).toBeLessThanOrEqual(20);
    expect(guidance.body.optimal).toBe(16);
  });

  it('monospace font gets smaller optimal (13-14)', () => {
    const font = makeFont({ category: 'monospace' });
    const guidance = computeSizeGuidance(font);
    expect(guidance.body.optimal).toBeGreaterThanOrEqual(13);
    expect(guidance.body.optimal).toBeLessThanOrEqual(14);
    expect(guidance.body.min).toBeGreaterThanOrEqual(13);
    expect(guidance.body.max).toBeLessThanOrEqual(18);
  });

  it('display font gets higher min (20+)', () => {
    const font = makeFont({ category: 'display' });
    const guidance = computeSizeGuidance(font);
    expect(guidance.body.min).toBeGreaterThanOrEqual(20);
    expect(guidance.display.min).toBeGreaterThanOrEqual(20);
  });

  it('font with opsz axis gets optical size mapping', () => {
    const font = makeFont({
      hasOpticalSizing: true,
      axes: [
        {
          tag: 'opsz',
          name: 'Optical Size',
          min: 8,
          max: 144,
          default: 14,
          step: 0.1,
          cssProperty: 'font-optical-sizing',
        },
      ],
    });
    const guidance = computeSizeGuidance(font);
    expect(guidance.opticalSizeMapping).not.toBeNull();
    expect(Array.isArray(guidance.opticalSizeMapping)).toBe(true);
    expect(guidance.opticalSizeMapping!.length).toBeGreaterThan(0);
    // cssSize 72 should map to an opsz near the max end
    const large = guidance.opticalSizeMapping!.find((m) => m.cssSize === 72);
    expect(large).toBeDefined();
    expect(large!.opszValue).toBeGreaterThan(8);
  });

  it('font without opsz axis gets null mapping', () => {
    const font = makeFont({ axes: [] });
    const guidance = computeSizeGuidance(font);
    expect(guidance.opticalSizeMapping).toBeNull();
  });

  it('all fields are present in output', () => {
    const font = makeFont({});
    const guidance = computeSizeGuidance(font);
    expect(guidance).toHaveProperty('body');
    expect(guidance.body).toHaveProperty('min');
    expect(guidance.body).toHaveProperty('optimal');
    expect(guidance.body).toHaveProperty('max');
    expect(guidance).toHaveProperty('display');
    expect(guidance.display).toHaveProperty('min');
    expect(guidance).toHaveProperty('caption');
    expect(guidance.caption).toHaveProperty('min');
    expect(guidance).toHaveProperty('opticalSizeMapping');
  });

  it('handwriting font has larger body sizes than monospace', () => {
    const handwriting = computeSizeGuidance(makeFont({ category: 'handwriting' }));
    const monospace = computeSizeGuidance(makeFont({ category: 'monospace' }));
    expect(handwriting.body.optimal).toBeGreaterThan(monospace.body.optimal);
  });

  it('font with low x-height ratio gets bumped min size', () => {
    const lowXHeight = makeFont({
      category: 'serif',
      metrics: {
        unitsPerEm: 1000,
        ascent: 800,
        descent: -200,
        lineGap: 0,
        // x-height ratio ~0.40, well below average 0.52 — should bump min
        xHeight: 400,
        capHeight: 680,
        useTypoMetrics: false,
        hheaAscent: null,
        hheaDescent: null,
        winAscent: null,
        winDescent: null,
      },
    });
    const normalFont = makeFont({ category: 'serif' });
    const lowGuidance = computeSizeGuidance(lowXHeight);
    const normalGuidance = computeSizeGuidance(normalFont);
    expect(lowGuidance.body.min).toBeGreaterThan(normalGuidance.body.min);
  });

  it('caption min for monospace is smaller than for serif', () => {
    const mono = computeSizeGuidance(makeFont({ category: 'monospace' }));
    const serif = computeSizeGuidance(makeFont({ category: 'serif' }));
    expect(mono.caption.min).toBeLessThan(serif.caption.min);
  });
});
