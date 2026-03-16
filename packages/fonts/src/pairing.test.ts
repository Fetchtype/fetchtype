import { describe, expect, it } from 'vitest';
import { recommendPairings, resolvePairings } from './pairing.js';
import { loadRegistry } from './registry.js';

describe('recommendPairings', () => {
  it('returns curated pairings for Inter', () => {
    const pairings = recommendPairings('inter');
    expect(pairings.length).toBeGreaterThan(0);
    expect(pairings[0]!.confidence).toBeGreaterThan(0.8);
    expect(pairings[0]!.rationale).toBeTruthy();
  });

  it('filters by role', () => {
    const headings = recommendPairings('inter', { role: 'heading' });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.every(p => p.role === 'heading')).toBe(true);

    const mono = recommendPairings('inter', { role: 'mono' });
    expect(mono.length).toBeGreaterThan(0);
    expect(mono.every(p => p.role === 'mono')).toBe(true);
  });

  it('respects limit', () => {
    const pairings = recommendPairings('inter', { limit: 2 });
    expect(pairings.length).toBeLessThanOrEqual(2);
  });

  it('returns algorithmic pairings for fonts without curated data', () => {
    const pairings = recommendPairings('abeezee');
    expect(pairings.length).toBeGreaterThan(0);
    expect(pairings[0]!.fontId).toBeTruthy();
  });

  it('returns empty for unknown font', () => {
    expect(recommendPairings('nonexistent')).toEqual([]);
  });

  it('provides curated pairings for Roboto', () => {
    const pairings = recommendPairings('roboto');
    expect(pairings.length).toBeGreaterThan(0);
    // Roboto Slab should be a top pairing
    expect(pairings.some(p => p.fontId.includes('roboto-slab'))).toBe(true);
  });

  it('provides pairings for IBM Plex Sans (same-family)', () => {
    const pairings = recommendPairings('ibm-plex-sans');
    expect(pairings.length).toBeGreaterThan(0);
  });
});

describe('resolvePairings', () => {
  it('resolves pairing recommendations to full FontEntry objects', () => {
    const resolved = resolvePairings('inter', { limit: 3 });
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved[0]!.font.family).toBeTruthy();
    expect(resolved[0]!.role).toBeTruthy();
    expect(resolved[0]!.confidence).toBeGreaterThan(0);
  });

  it('returns empty for unknown font', () => {
    expect(resolvePairings('nonexistent')).toEqual([]);
  });
});

describe('pairing source enrichment', () => {
  it('algorithmic pairings for fonts without curated data have source: algorithmic', () => {
    // ABeeZee is a long-tail font without curated pairings
    const pairings = recommendPairings('abeezee');
    expect(pairings.length).toBeGreaterThan(0);
    // All returned pairings should be algorithmic since abeezee has no curated data
    for (const p of pairings) {
      expect(p.source).toBe('algorithmic');
    }
  });

  it('curated pairings retain source: curated', () => {
    // Inter has curated pairings
    const pairings = recommendPairings('inter', { limit: 3 });
    expect(pairings.length).toBeGreaterThan(0);
    const curatedPairings = pairings.filter(p => p.source === 'curated');
    expect(curatedPairings.length).toBeGreaterThan(0);
  });

  it('pairing coverage is greater than 50% of registry fonts', () => {
    const reg = loadRegistry();
    const withPairings = reg.fonts.filter(
      f => f.pairing?.recommended && f.pairing.recommended.length > 0,
    ).length;
    const coverage = withPairings / reg.fonts.length;
    expect(coverage).toBeGreaterThan(0.5);
  });
});
