import { describe, expect, it } from 'vitest';
import {
  loadRegistry,
  registryStats,
  resolveFont,
  hasFont,
  searchRegistry,
  suggestFromRegistry,
  getPairings,
} from './registry.js';

describe('loadRegistry', () => {
  it('loads the full registry', () => {
    const reg = loadRegistry();
    expect(reg.version).toBe('2.1.0');
    expect(reg.fonts.length).toBeGreaterThan(1500);
    expect(reg.count).toBe(reg.fonts.length);
  });
});

describe('registryStats', () => {
  it('returns summary stats', () => {
    const stats = registryStats();
    expect(stats.version).toBe('2.1.0');
    expect(stats.count).toBeGreaterThan(1500);
    expect(stats.variableCount).toBeGreaterThan(400);
  });
});

describe('resolveFont', () => {
  it('resolves by ID', () => {
    const font = resolveFont('inter');
    expect(font).toBeDefined();
    expect(font!.family).toBe('Inter');
    expect(font!.source).toBe('google');
  });

  it('resolves by family name', () => {
    const font = resolveFont('Inter');
    expect(font).toBeDefined();
    expect(font!.id).toBe('inter');
  });

  it('resolves case-insensitively', () => {
    const font = resolveFont('ROBOTO');
    expect(font).toBeDefined();
  });

  it('resolves system fonts', () => {
    const font = resolveFont('arial');
    expect(font).toBeDefined();
    expect(font!.source).toBe('system');
    expect(font!.install.system).not.toBeNull();
  });

  it('returns undefined for unknown fonts', () => {
    expect(resolveFont('nonexistent-font-xyz')).toBeUndefined();
  });
});

describe('hasFont', () => {
  it('returns true for known fonts', () => {
    expect(hasFont('inter')).toBe(true);
    expect(hasFont('Arial')).toBe(true);
  });

  it('returns false for unknown fonts', () => {
    expect(hasFont('nope')).toBe(false);
  });
});

describe('searchRegistry', () => {
  it('returns all fonts up to limit with no filters', () => {
    const results = searchRegistry({ limit: 10 });
    expect(results).toHaveLength(10);
  });

  it('filters by category', () => {
    const results = searchRegistry({ category: 'monospace', limit: 100 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.category === 'monospace')).toBe(true);
  });

  it('filters by variable', () => {
    const results = searchRegistry({ variable: true, limit: 100 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.variable)).toBe(true);
  });

  it('filters by context', () => {
    const results = searchRegistry({ context: 'mono', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.contexts.includes('mono'))).toBe(true);
  });

  it('filters by subset', () => {
    const results = searchRegistry({ subset: 'cyrillic', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.subsets.some(s => s.toLowerCase() === 'cyrillic'))).toBe(true);
  });

  it('filters by source', () => {
    const results = searchRegistry({ source: 'system', limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.source === 'system')).toBe(true);
  });

  it('filters by maxPayload', () => {
    const results = searchRegistry({ maxPayload: 20000, limit: 50 });
    expect(results.every(f => f.performance.estimatedPayload <= 20000)).toBe(true);
  });

  it('searches by free-text query', () => {
    const results = searchRegistry({ query: 'inter', limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.family === 'Inter')).toBe(true);
  });

  it('combines filters', () => {
    const results = searchRegistry({
      category: 'sans-serif',
      variable: true,
      context: 'interface',
      limit: 50,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f =>
      f.category === 'sans-serif' &&
      f.variable &&
      f.contexts.includes('interface')
    )).toBe(true);
  });
});

describe('suggestFromRegistry', () => {
  it('suggests fonts for interface context', () => {
    const results = suggestFromRegistry({ context: 'interface', limit: 5 });
    expect(results).toHaveLength(5);
    expect(results.every(f => f.contexts.includes('interface'))).toBe(true);
  });

  it('excludes system fonts from suggestions', () => {
    const results = suggestFromRegistry({ context: 'interface', limit: 100 });
    expect(results.every(f => f.source !== 'system')).toBe(true);
  });

  it('prioritizes variable fonts', () => {
    const results = suggestFromRegistry({ context: 'interface', limit: 10 });
    // First result should be variable if any variable fonts match
    const firstVariable = results.findIndex(f => f.variable);
    const firstStatic = results.findIndex(f => !f.variable);
    if (firstVariable >= 0 && firstStatic >= 0) {
      expect(firstVariable).toBeLessThan(firstStatic);
    }
  });

  it('respects maxPayload filter', () => {
    const results = suggestFromRegistry({ context: 'reading', maxPayload: 20000, limit: 20 });
    expect(results.every(f => f.performance.estimatedPayload <= 20000)).toBe(true);
  });

  it('suggests mono fonts', () => {
    const results = suggestFromRegistry({ context: 'mono', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.contexts.includes('mono'))).toBe(true);
  });
});

describe('getPairings', () => {
  it('returns empty array for font without pairings', () => {
    // Most fonts start with empty pairings until enrichment
    const result = getPairings('inter');
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array for unknown font', () => {
    expect(getPairings('nonexistent')).toEqual([]);
  });
});
