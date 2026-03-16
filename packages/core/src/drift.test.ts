import { describe, expect, it } from 'vitest';

import { DEFAULT_TOKEN_SET } from './presets.js';
import { detectDrift } from './drift.js';

// Helper: clone and mutate
function cloneWith(mutations: (ts: typeof DEFAULT_TOKEN_SET) => void): typeof DEFAULT_TOKEN_SET {
  const clone = structuredClone(DEFAULT_TOKEN_SET);
  mutations(clone);
  return clone;
}

describe('detectDrift', () => {
  it('returns an empty report for identical token sets', () => {
    const report = detectDrift(DEFAULT_TOKEN_SET, DEFAULT_TOKEN_SET);
    expect(report.breaking).toHaveLength(0);
    expect(report.nonBreaking).toHaveLength(0);
    expect(report.improvements).toHaveLength(0);
    expect(report.summary).toBe('No changes detected.');
  });

  it('classifies a font family swap as breaking', () => {
    const current = cloneWith((ts) => {
      ts.typography.body!.fontFamily = ['Roboto', 'sans-serif'];
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.breaking.some((c) => c.path === 'typography.body.fontFamily')).toBe(true);
  });

  it('classifies a font size change within ±20% as non-breaking', () => {
    const current = cloneWith((ts) => {
      // DEFAULT body fontSize is 1rem (16px); 15px is -6.25% — within tolerance
      ts.typography.body!.fontSize = '0.9375rem'; // 15px
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.nonBreaking.some((c) => c.path === 'typography.body.fontSize')).toBe(true);
    expect(report.breaking.some((c) => c.path === 'typography.body.fontSize')).toBe(false);
  });

  it('classifies theme removal as breaking', () => {
    const current = cloneWith((ts) => {
      ts.themes = ts.themes.filter((t) => t.name !== 'brand-ocean');
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.breaking.some((c) => c.path === 'themes.brand-ocean')).toBe(true);
  });

  it('classifies a new theme addition as an improvement', () => {
    const current = cloneWith((ts) => {
      ts.themes = [
        ...ts.themes,
        { name: 'high-contrast', colorScheme: 'high-contrast', tokens: {} },
      ];
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.improvements.some((c) => c.path === 'themes.high-contrast')).toBe(true);
  });

  it('classifies scale type change as breaking', () => {
    const current = cloneWith((ts) => {
      ts.hierarchy.scale = 'minor-second';
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.breaking.some((c) => c.path === 'hierarchy.scale')).toBe(true);
  });

  it('classifies heading size order violation (h2 > h1 in current) as breaking', () => {
    const current = cloneWith((ts) => {
      ts.hierarchy.headings.h2.fontSize = '9rem'; // larger than h1
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(
      report.breaking.some((c) => c.path === 'hierarchy.headings.h2.fontSize'),
    ).toBe(true);
  });

  it('classifies mode removal as breaking', () => {
    const current = cloneWith((ts) => {
      const { reading: _removed, ...rest } = ts.modes as Record<string, unknown>;
      ts.modes = rest as typeof ts.modes;
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.breaking.some((c) => c.path === 'modes.reading')).toBe(true);
  });

  it('classifies a new mode addition as an improvement', () => {
    const current = cloneWith((ts) => {
      ts.modes = {
        ...ts.modes,
        'extra-large': {
          name: 'extra-large',
          tokens: { 'typography.body.fontSize': '1.5rem' },
        },
      };
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.improvements.some((c) => c.path === 'modes.extra-large')).toBe(true);
  });

  it('classifies body font size below 14px as breaking', () => {
    const current = cloneWith((ts) => {
      ts.typography.body!.fontSize = '0.75rem'; // 12px
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(
      report.breaking.some(
        (c) => c.path === 'typography.body.fontSize' && c.kind === 'breaking',
      ),
    ).toBe(true);
  });

  it('classifies a new typography context as an improvement', () => {
    // Build a baseline missing the "blockquote" context, then compare against the full set
    const baselineMissingContext = cloneWith((ts) => {
      const { blockquote: _removed, ...rest } = ts.typography as Record<string, unknown>;
      ts.typography = rest as typeof ts.typography;
    });
    const report = detectDrift(baselineMissingContext, DEFAULT_TOKEN_SET);
    expect(
      report.improvements.some((c) => c.path === 'typography.blockquote' && c.category === 'font'),
    ).toBe(true);
  });

  it('summary reflects counts accurately', () => {
    const current = cloneWith((ts) => {
      ts.typography.body!.fontFamily = ['Roboto', 'sans-serif']; // breaking
      ts.themes = ts.themes.filter((t) => t.name !== 'brand-ocean'); // breaking (removal)
    });
    const report = detectDrift(DEFAULT_TOKEN_SET, current);
    expect(report.breaking.length).toBeGreaterThanOrEqual(2);
    expect(report.summary).toContain('breaking');
  });
});
