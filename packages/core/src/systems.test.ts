import { describe, expect, it } from 'vitest';

import { queryTypographySystems, TYPOGRAPHY_PATTERNS, TYPOGRAPHY_SYSTEMS } from './systems.js';

describe('queryTypographySystems', () => {
  it('returns both official systems and foundational archetypes by default', () => {
    const result = queryTypographySystems();

    expect(result.systems).toHaveLength(TYPOGRAPHY_SYSTEMS.length);
    expect(result.patterns).toHaveLength(TYPOGRAPHY_PATTERNS.length);
  });

  it('filters by use case', () => {
    const result = queryTypographySystems({ useCase: 'government-service' });
    const ids = result.systems.map((system) => system.id);

    expect(ids).toEqual(expect.arrayContaining(['govuk', 'uswds']));
    expect(ids).not.toContain('material-3');
  });

  it('filters by foundational kind', () => {
    const result = queryTypographySystems({ kind: 'foundational-archetype' });

    expect(result.systems.every((system) => system.kind === 'foundational-archetype')).toBe(true);
    expect(result.systems.map((system) => system.id)).toContain('editorial-old-style-serif');
  });

  it('matches keyword queries across system details', () => {
    const result = queryTypographySystems({ query: 'dynamic type' });

    expect(result.systems.map((system) => system.id)).toContain('apple-hig');
  });

  it('limits patterns to the filtered evidence set', () => {
    const result = queryTypographySystems({ useCase: 'commerce-admin' });

    expect(result.systems.map((system) => system.id)).toEqual(['polaris']);
    expect(result.patterns.map((pattern) => pattern.id)).toContain('tabular-thinking-for-data');
    expect(result.patterns.map((pattern) => pattern.id)).not.toContain('platform-familiarity');
  });

  it('can omit patterns for callers that only need the systems', () => {
    const result = queryTypographySystems({ includePatterns: false });

    expect(result.patterns).toEqual([]);
  });
});
