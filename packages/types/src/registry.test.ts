import { describe, expect, it } from 'vitest';

import {
  FontEntrySchema,
  FontRegistrySchema,
  RenderingTargetSchema,
  TypographicContextSchema,
  RegistryVariableAxisSchema,
  FallbackTargetSchema,
  PairingRecommendationSchema,
  SystemFontInfoSchema,
  FontMetricsSchema,
  FontPerformanceSchema,
} from './registry.js';

// Minimal valid FontEntry fixture
const VALID_FONT_ENTRY = {
  id: 'inter',
  family: 'Inter',
  version: 'v18',
  source: 'google' as const,
  lastUpdated: '2026-03-15',
  category: 'sans-serif' as const,
  tags: ['geometric', 'neo-grotesque'],
  contexts: ['interface', 'reading'],
  variable: true,
  axes: [
    {
      tag: 'wght',
      name: 'Weight',
      min: 100,
      max: 900,
      default: 400,
      step: 1,
      cssProperty: 'font-weight',
    },
  ],
  weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  styles: ['normal', 'italic'] as const,
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  formats: ['woff2'] as const,
  hasItalic: true,
  hasOpticalSizing: false,
  performance: {
    woff2Size: { latin: 24576, cyrillic: 18432 },
    variableFileSize: 312000,
    estimatedPayload: 24576,
    loadingImpact: 'minimal' as const,
  },
  metrics: {
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
  },
  fallback: {
    targets: [
      {
        target: 'apple' as const,
        fallbackFont: 'Helvetica Neue',
        localNames: ['Helvetica Neue'],
        overrides: {
          ascentOverride: '92.67%',
          descentOverride: '24.41%',
          lineGapOverride: '0%',
          sizeAdjust: '100.28%',
        },
      },
    ],
    requiresPlatformSplit: false,
    generatedCSS: '@font-face { font-family: "Inter Fallback"; ... }',
  },
  pairing: {
    recommended: [
      {
        fontId: 'crimson-pro',
        role: 'body' as const,
        confidence: 0.85,
        rationale: 'Geometric sans pairs with transitional serif for contrast',
      },
    ],
  },
  license: {
    type: 'OFL-1.1',
    url: 'https://scripts.sil.org/OFL',
    commercial: true,
    selfHostable: true,
    attribution: null,
  },
  install: {
    fontsource: '@fontsource-variable/inter',
    googleCdn: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900',
    npmPackage: '@fontsource-variable/inter',
    system: null,
  },
};

describe('RenderingTargetSchema', () => {
  it('accepts valid rendering targets', () => {
    for (const target of ['apple', 'windows', 'android', 'linux', 'universal']) {
      expect(RenderingTargetSchema.parse(target)).toBe(target);
    }
  });

  it('rejects invalid targets', () => {
    expect(() => RenderingTargetSchema.parse('ios')).toThrow();
    expect(() => RenderingTargetSchema.parse('macos')).toThrow();
  });
});

describe('TypographicContextSchema', () => {
  it('accepts all 6 contexts', () => {
    for (const ctx of ['display', 'interface', 'reading', 'mono', 'editorial', 'data']) {
      expect(TypographicContextSchema.parse(ctx)).toBe(ctx);
    }
  });

  it('rejects token-level contexts', () => {
    expect(() => TypographicContextSchema.parse('heading')).toThrow();
    expect(() => TypographicContextSchema.parse('body')).toThrow();
  });
});

describe('RegistryVariableAxisSchema', () => {
  it('accepts valid axis', () => {
    const axis = {
      tag: 'wght',
      name: 'Weight',
      min: 100,
      max: 900,
      default: 400,
      step: 1,
      cssProperty: 'font-weight',
    };
    expect(RegistryVariableAxisSchema.parse(axis)).toEqual(axis);
  });

  it('accepts null cssProperty for custom axes', () => {
    const axis = {
      tag: 'GRAD',
      name: 'Grade',
      min: -200,
      max: 150,
      default: 0,
      step: 1,
      cssProperty: null,
    };
    expect(RegistryVariableAxisSchema.parse(axis)).toEqual(axis);
  });
});

describe('FallbackTargetSchema', () => {
  it('accepts valid fallback target', () => {
    const target = {
      target: 'windows',
      fallbackFont: 'Segoe UI',
      localNames: ['Segoe UI Variable', 'Segoe UI'],
      overrides: {
        ascentOverride: '90.04%',
        descentOverride: '22.43%',
        lineGapOverride: '0%',
        sizeAdjust: '107.12%',
      },
    };
    expect(FallbackTargetSchema.parse(target)).toEqual(target);
  });
});

describe('PairingRecommendationSchema', () => {
  it('accepts valid pairing', () => {
    const pairing = {
      fontId: 'source-serif-4',
      role: 'body',
      confidence: 0.92,
      rationale: 'High x-height geometric sans pairs well with modern transitional serif',
    };
    expect(PairingRecommendationSchema.parse(pairing)).toEqual(pairing);
  });

  it('rejects confidence outside 0-1', () => {
    expect(() =>
      PairingRecommendationSchema.parse({
        fontId: 'x',
        role: 'heading',
        confidence: 1.5,
        rationale: 'test',
      }),
    ).toThrow();
  });
});

describe('SystemFontInfoSchema', () => {
  it('accepts system font entry', () => {
    const info = {
      platforms: ['apple'],
      localNames: ['Helvetica Neue'],
      cssKeywords: ['-apple-system', 'BlinkMacSystemFont'],
      note: null,
    };
    expect(SystemFontInfoSchema.parse(info)).toEqual(info);
  });
});

describe('FontMetricsSchema', () => {
  it('accepts metrics with nullable raw values', () => {
    const metrics = VALID_FONT_ENTRY.metrics;
    expect(FontMetricsSchema.parse(metrics)).toEqual(metrics);
  });

  it('accepts metrics with raw hhea/win values', () => {
    const metrics = {
      ...VALID_FONT_ENTRY.metrics,
      hheaAscent: 2048,
      hheaDescent: -512,
      winAscent: 2200,
      winDescent: 520,
    };
    expect(FontMetricsSchema.parse(metrics)).toEqual(metrics);
  });
});

describe('FontPerformanceSchema', () => {
  it('classifies loading impact', () => {
    for (const impact of ['minimal', 'moderate', 'heavy']) {
      const perf = { ...VALID_FONT_ENTRY.performance, loadingImpact: impact };
      expect(FontPerformanceSchema.parse(perf).loadingImpact).toBe(impact);
    }
  });
});

describe('FontEntrySchema', () => {
  it('accepts a complete valid FontEntry', () => {
    const result = FontEntrySchema.parse(VALID_FONT_ENTRY);
    expect(result.id).toBe('inter');
    expect(result.family).toBe('Inter');
    expect(result.variable).toBe(true);
    expect(result.contexts).toContain('interface');
    expect(result.metrics.useTypoMetrics).toBe(true);
    expect(result.fallback.requiresPlatformSplit).toBe(false);
    expect(result.pairing.recommended).toHaveLength(1);
    expect(result.license.commercial).toBe(true);
    expect(result.install.fontsource).toBe('@fontsource-variable/inter');
  });

  it('rejects entry with missing required fields', () => {
    expect(() => FontEntrySchema.parse({ id: 'incomplete' })).toThrow();
  });

  it('rejects invalid source', () => {
    expect(() =>
      FontEntrySchema.parse({ ...VALID_FONT_ENTRY, source: 'unknown' }),
    ).toThrow();
  });

  it('rejects invalid category', () => {
    expect(() =>
      FontEntrySchema.parse({ ...VALID_FONT_ENTRY, category: 'script' }),
    ).toThrow();
  });

  it('accepts system source with system install info', () => {
    const systemEntry = {
      ...VALID_FONT_ENTRY,
      id: 'helvetica-neue',
      family: 'Helvetica Neue',
      source: 'system',
      install: {
        fontsource: null,
        googleCdn: null,
        npmPackage: null,
        system: {
          platforms: ['apple'],
          localNames: ['Helvetica Neue'],
          cssKeywords: [],
          note: 'Ships on all Apple devices since OS X 10.7 / iOS 7',
        },
      },
    };
    const result = FontEntrySchema.parse(systemEntry);
    expect(result.install.system).not.toBeNull();
    expect(result.install.system!.platforms).toContain('apple');
  });
});

describe('FontRegistrySchema', () => {
  it('accepts a valid registry', () => {
    const registry = {
      version: '2.1.0',
      generatedAt: '2026-03-15T12:00:00Z',
      count: 1,
      fonts: [VALID_FONT_ENTRY],
    };
    const result = FontRegistrySchema.parse(registry);
    expect(result.count).toBe(1);
    expect(result.fonts).toHaveLength(1);
  });

  it('accepts empty registry', () => {
    const registry = {
      version: '2.1.0',
      generatedAt: '2026-03-15T12:00:00Z',
      count: 0,
      fonts: [],
    };
    expect(FontRegistrySchema.parse(registry).fonts).toHaveLength(0);
  });
});
