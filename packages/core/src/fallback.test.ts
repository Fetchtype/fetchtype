import { describe, expect, it } from 'vitest';
import {
  computeFallbackOverrides,
  computeFallbackTargets,
  generateFallbackCSS,
  requiresPlatformSplit,
  SYSTEM_FALLBACK_METRICS,
} from './fallback.js';
import type { FontEntry, FontMetrics } from '@fetchtype/types';

// Inter's actual metrics
const INTER_METRICS: FontMetrics = {
  unitsPerEm: 2048,
  ascent: 1984,
  descent: -494,
  lineGap: 0,
  xHeight: 1118,
  capHeight: 1490,
  useTypoMetrics: true,
  hheaAscent: null,
  hheaDescent: null,
  winAscent: null,
  winDescent: null,
};

const INTER_ENTRY: FontEntry = {
  id: 'inter',
  family: 'Inter',
  version: 'v18',
  source: 'google',
  lastUpdated: '2026-03-15',
  category: 'sans-serif',
  tags: ['geometric'],
  contexts: ['interface', 'reading'],
  variable: true,
  axes: [{ tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, step: 1, cssProperty: 'font-weight' }],
  weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  styles: ['normal', 'italic'],
  subsets: ['latin'],
  formats: ['woff2'],
  hasItalic: true,
  hasOpticalSizing: false,
  performance: {
    woff2Size: { latin: 24576 },
    variableFileSize: 312000,
    estimatedPayload: 24576,
    loadingImpact: 'minimal',
  },
  metrics: INTER_METRICS,
  fallback: { targets: [], requiresPlatformSplit: false, generatedCSS: '' },
  pairing: { recommended: [] },
  license: { type: 'OFL-1.1', url: 'https://openfontlicense.org', commercial: true, selfHostable: true, attribution: null },
  install: { fontsource: '@fontsource-variable/inter', googleCdn: '', npmPackage: '@fontsource-variable/inter', system: null },
};

describe('SYSTEM_FALLBACK_METRICS', () => {
  it('has all 5 rendering targets', () => {
    expect(Object.keys(SYSTEM_FALLBACK_METRICS)).toEqual(
      expect.arrayContaining(['apple', 'windows', 'android', 'linux', 'universal']),
    );
  });

  it('each target has all 3 generics', () => {
    for (const target of Object.values(SYSTEM_FALLBACK_METRICS)) {
      expect(target).toHaveProperty('sans-serif');
      expect(target).toHaveProperty('serif');
      expect(target).toHaveProperty('monospace');
    }
  });

  it('each fallback has font name, localNames, and metrics', () => {
    for (const target of Object.values(SYSTEM_FALLBACK_METRICS)) {
      for (const fb of Object.values(target)) {
        expect(fb.font).toBeTruthy();
        expect(fb.localNames.length).toBeGreaterThan(0);
        expect(fb.metrics.unitsPerEm).toBeGreaterThan(0);
      }
    }
  });
});

describe('computeFallbackOverrides', () => {
  it('computes overrides as CSS percentage strings', () => {
    const arialMetrics = SYSTEM_FALLBACK_METRICS.universal['sans-serif'].metrics;
    const overrides = computeFallbackOverrides(INTER_METRICS, arialMetrics, 'universal');

    expect(overrides.ascentOverride).toMatch(/^\d+\.\d+%$/);
    expect(overrides.descentOverride).toMatch(/^\d+\.\d+%$/);
    expect(overrides.lineGapOverride).toMatch(/^\d+\.\d+%$/);
    expect(overrides.sizeAdjust).toMatch(/^\d+\.\d+%$/);
  });

  it('ascent override reflects the target font ascent ratio', () => {
    const arialMetrics = SYSTEM_FALLBACK_METRICS.universal['sans-serif'].metrics;
    const overrides = computeFallbackOverrides(INTER_METRICS, arialMetrics, 'universal');

    // Inter ascent: 1984/2048 ≈ 96.88%
    const expectedAscent = (1984 / 2048) * 100;
    expect(parseFloat(overrides.ascentOverride)).toBeCloseTo(expectedAscent, 1);
  });

  it('descent override is absolute value', () => {
    const arialMetrics = SYSTEM_FALLBACK_METRICS.universal['sans-serif'].metrics;
    const overrides = computeFallbackOverrides(INTER_METRICS, arialMetrics, 'universal');

    // Inter descent: |-494|/2048 ≈ 24.12%
    const expectedDescent = (494 / 2048) * 100;
    expect(parseFloat(overrides.descentOverride)).toBeCloseTo(expectedDescent, 1);
  });

  it('produces different overrides for different targets when not useTypoMetrics', () => {
    const nonTypoMetrics: FontMetrics = {
      ...INTER_METRICS,
      useTypoMetrics: false,
      hheaAscent: 2000,
      hheaDescent: -500,
      winAscent: 2100,
      winDescent: 520,
    };
    const arialMetrics = SYSTEM_FALLBACK_METRICS.universal['sans-serif'].metrics;

    const appleOverrides = computeFallbackOverrides(nonTypoMetrics, arialMetrics, 'apple');
    const windowsOverrides = computeFallbackOverrides(nonTypoMetrics, arialMetrics, 'windows');

    // Apple uses hhea, Windows uses win — values should differ
    expect(appleOverrides.ascentOverride).not.toBe(windowsOverrides.ascentOverride);
  });
});

describe('computeFallbackTargets', () => {
  it('returns 5 targets', () => {
    const targets = computeFallbackTargets(INTER_ENTRY);
    expect(targets).toHaveLength(5);
    expect(targets.map(t => t.target)).toEqual(
      expect.arrayContaining(['windows', 'apple', 'android', 'linux', 'universal']),
    );
  });

  it('uses correct fallback font for category', () => {
    const targets = computeFallbackTargets(INTER_ENTRY);
    const windowsTarget = targets.find(t => t.target === 'windows')!;
    expect(windowsTarget.fallbackFont).toBe('Segoe UI');

    const appleTarget = targets.find(t => t.target === 'apple')!;
    expect(appleTarget.fallbackFont).toBe('Helvetica Neue');
  });

  it('each target has overrides', () => {
    const targets = computeFallbackTargets(INTER_ENTRY);
    for (const target of targets) {
      expect(target.overrides.ascentOverride).toMatch(/%$/);
      expect(target.overrides.descentOverride).toMatch(/%$/);
      expect(target.overrides.lineGapOverride).toMatch(/%$/);
      expect(target.overrides.sizeAdjust).toMatch(/%$/);
    }
  });
});

describe('requiresPlatformSplit', () => {
  it('returns false when useTypoMetrics is true', () => {
    expect(requiresPlatformSplit(INTER_METRICS)).toBe(false);
  });

  it('returns true when useTypoMetrics is false', () => {
    expect(requiresPlatformSplit({ ...INTER_METRICS, useTypoMetrics: false })).toBe(true);
  });
});

describe('generateFallbackCSS', () => {
  it('generates CSS with @font-face blocks', () => {
    const css = generateFallbackCSS(INTER_ENTRY);
    expect(css).toContain('@font-face');
    expect(css).toContain('ascent-override:');
    expect(css).toContain('descent-override:');
    expect(css).toContain('size-adjust:');
  });

  it('wraps in @supports by default', () => {
    const css = generateFallbackCSS(INTER_ENTRY);
    expect(css).toContain('@supports (overflow-anchor: auto)');
  });

  it('skips @supports when safariWrap is false', () => {
    const css = generateFallbackCSS(INTER_ENTRY, { safariWrap: false });
    expect(css).not.toContain('@supports');
  });

  it('generates per-target fallback names', () => {
    const css = generateFallbackCSS(INTER_ENTRY);
    expect(css).toContain('Inter Fallback Windows');
    expect(css).toContain('Inter Fallback Apple');
    expect(css).toContain('Inter Fallback Android');
    expect(css).toContain('Inter Fallback');
  });

  it('includes font-family stack by default', () => {
    const css = generateFallbackCSS(INTER_ENTRY);
    expect(css).toContain('font-family:');
    expect(css).toContain('Inter,');
    expect(css).toContain('sans-serif;');
  });

  it('generates compact CSS when compact=true', () => {
    const css = generateFallbackCSS(INTER_ENTRY, { compact: true });
    // Compact mode uses single @font-face
    const fontFaceCount = (css.match(/@font-face/g) ?? []).length;
    expect(fontFaceCount).toBe(1);
    expect(css).toContain('"Inter Fallback"');
  });

  it('uses custom selector', () => {
    const css = generateFallbackCSS(INTER_ENTRY, { selector: '.content' });
    expect(css).toContain('.content {');
  });

  it('omits stack when includeStack is false', () => {
    const css = generateFallbackCSS(INTER_ENTRY, { includeStack: false });
    expect(css).not.toContain('body {');
    expect(css).not.toContain('sans-serif;');
  });

  it('uses correct local() names for each target', () => {
    const css = generateFallbackCSS(INTER_ENTRY);
    expect(css).toContain('local("Segoe UI Variable")');
    expect(css).toContain('local("Helvetica Neue")');
    expect(css).toContain('local("Roboto")');
    expect(css).toContain('local("Arial")');
  });
});
