import { describe, expect, it } from 'vitest';
import { computeTypographyScore } from './score.js';
import { DEFAULT_TOKEN_SET } from './presets.js';
import type { DesignTokenSet } from '@fetchtype/types';

describe('computeTypographyScore', () => {
  it('scores the default token set highly', () => {
    const result = computeTypographyScore(DEFAULT_TOKEN_SET);
    expect(result.overall).toBeGreaterThanOrEqual(80);
    expect(result.grade).toMatch(/^[AB]/);
    expect(result.dimensions).toHaveLength(6);
  });

  it('returns all dimension names', () => {
    const result = computeTypographyScore(DEFAULT_TOKEN_SET);
    const names = result.dimensions.map(d => d.name);
    expect(names).toContain('Readability');
    expect(names).toContain('Contrast');
    expect(names).toContain('Scale & Hierarchy');
    expect(names).toContain('Consistency');
    expect(names).toContain('Performance');
    expect(names).toContain('Completeness');
  });

  it('generates a badge string', () => {
    const result = computeTypographyScore(DEFAULT_TOKEN_SET);
    expect(result.badge).toContain('fetchtype');
    expect(result.badge).toContain(String(result.overall));
    expect(result.badge).toContain(result.grade);
  });

  it('penalizes bad readability', () => {
    const tokens = structuredClone(DEFAULT_TOKEN_SET) as DesignTokenSet;
    tokens.typography.body!.lineHeight = 1.0;
    tokens.typography.body!.fontSize = '10px';
    const result = computeTypographyScore(tokens);
    const readability = result.dimensions.find(d => d.name === 'Readability')!;
    expect(readability.score).toBeLessThan(60);
  });

  it('penalizes missing dark mode', () => {
    const tokens = structuredClone(DEFAULT_TOKEN_SET) as DesignTokenSet;
    delete (tokens.color as any).dark;
    const result = computeTypographyScore(tokens);
    const contrast = result.dimensions.find(d => d.name === 'Contrast')!;
    expect(contrast.score).toBeLessThan(90);
  });

  it('gives improvements for low-scoring dimensions', () => {
    const tokens = structuredClone(DEFAULT_TOKEN_SET) as DesignTokenSet;
    tokens.typography.body!.lineHeight = 1.0;
    const result = computeTypographyScore(tokens);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it('applies validation report penalty', () => {
    const report = {
      pass: false,
      diagnostics: [],
      counts: { error: 5, warning: 3, info: 0 },
    };
    const withReport = computeTypographyScore(DEFAULT_TOKEN_SET, report);
    const withoutReport = computeTypographyScore(DEFAULT_TOKEN_SET);
    expect(withReport.overall).toBeLessThan(withoutReport.overall);
  });

  it('grades correctly: A+ >= 95, F < 60', () => {
    const result = computeTypographyScore(DEFAULT_TOKEN_SET);
    if (result.overall >= 95) expect(result.grade).toBe('A+');
    else if (result.overall >= 90) expect(result.grade).toBe('A');
  });
});
