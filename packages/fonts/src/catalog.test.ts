import { describe, expect, it } from 'vitest';

import { GOOGLE_FONTS_CATALOG, lookupFont, searchFonts } from './catalog.js';

describe('GOOGLE_FONTS_CATALOG', () => {
  it('has at least 30 entries', () => {
    expect(GOOGLE_FONTS_CATALOG.length).toBeGreaterThanOrEqual(30);
  });
});

describe('lookupFont', () => {
  it('finds Inter by exact name', () => {
    const entry = lookupFont('Inter');
    expect(entry).toBeDefined();
    expect(entry?.family).toBe('Inter');
    expect(entry?.category).toBe('sans-serif');
  });

  it('finds fonts case-insensitively', () => {
    const entry = lookupFont('jetbrains mono');
    expect(entry).toBeDefined();
    expect(entry?.family).toBe('JetBrains Mono');
  });

  it('returns undefined for unknown fonts', () => {
    expect(lookupFont('Nonexistent Font')).toBeUndefined();
  });
});

describe('searchFonts', () => {
  it('filters by category', () => {
    const results = searchFonts({ category: 'monospace' });
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.category).toBe('monospace');
    }
  });

  it('filters by context', () => {
    const results = searchFonts({ context: 'reading' });
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.contexts).toContain('reading');
    }
  });

  it('filters by variable', () => {
    const results = searchFonts({ variable: true });
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.variable).toBe(true);
    }
  });

  it('combines multiple filters', () => {
    const results = searchFonts({ category: 'serif', variable: true });
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.category).toBe('serif');
      expect(entry.variable).toBe(true);
    }
  });
});
