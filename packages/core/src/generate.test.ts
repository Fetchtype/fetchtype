import { describe, expect, it } from 'vitest';

import { generateTokenSet } from './generate.js';

describe('generateTokenSet', () => {
  it('returns a valid token set for dashboard context', () => {
    const result = generateTokenSet({ context: 'dashboard' });

    expect(result.tokenSet).toBeDefined();
    expect(result.tokenSet.typography).toBeDefined();
    expect(result.tokenSet.color).toBeDefined();
    expect(result.warnings).toBeInstanceOf(Array);
  });

  it('uses the editorial preset for editorial context', () => {
    const result = generateTokenSet({ context: 'editorial' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('editorial');
  });

  it('uses the editorial preset for blog context', () => {
    const result = generateTokenSet({ context: 'blog' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('editorial');
  });

  it('uses the dashboard preset for saas-dashboard context', () => {
    const result = generateTokenSet({ context: 'saas-dashboard' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('dashboard');
  });

  it('uses the ecommerce preset for ecommerce context', () => {
    const result = generateTokenSet({ context: 'ecommerce' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('ecommerce');
  });

  it('uses the docs preset for docs context', () => {
    const result = generateTokenSet({ context: 'docs' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('docs');
  });

  it('falls back to base preset for unknown context', () => {
    const result = generateTokenSet({ context: 'unknown-xyz-context' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('base');
  });

  it('falls back to base for marketing context', () => {
    const result = generateTokenSet({ context: 'marketing' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('base');
  });

  it('applies brandColor to accent tokens', () => {
    const hex = '#2563eb';
    const result = generateTokenSet({ context: 'dashboard', brandColor: hex });

    expect(result.tokenSet.color.light.text.accent.value).toBe(hex);
    expect(result.tokenSet.color.light.background.accent.value).toBe(hex);
    expect(result.tokenSet.color.light.interactive.default.value).toBe(hex);
    expect(result.tokenSet.color.dark.text.accent.value).toBe(hex);
    expect(result.tokenSet.color.dark.background.accent.value).toBe(hex);
    expect(result.tokenSet.color.dark.interactive.default.value).toBe(hex);
  });

  it('includes brandColor in reasoning', () => {
    const hex = '#ff6600';
    const result = generateTokenSet({ context: 'base', brandColor: hex });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain(hex);
  });

  it('result has reasoning array with at least 1 entry', () => {
    const result = generateTokenSet({ context: 'docs' });

    expect(result.reasoning).toBeInstanceOf(Array);
    expect(result.reasoning.length).toBeGreaterThanOrEqual(1);
  });

  it('result has fonts object with primary and secondary', () => {
    const result = generateTokenSet({ context: 'editorial' });

    expect(result.fonts).toBeDefined();
    expect(typeof result.fonts.primary).toBe('string');
    expect(typeof result.fonts.secondary).toBe('string');
    expect(result.fonts.primary.length).toBeGreaterThan(0);
    expect(result.fonts.secondary.length).toBeGreaterThan(0);
  });

  it('uses explicit preset when provided', () => {
    const result = generateTokenSet({ context: 'whatever', preset: 'material' });
    const reasoning = result.reasoning.join(' ');

    expect(reasoning).toContain('material');
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const opts = { context: 'ecommerce', brandColor: '#123456' };
    const result1 = generateTokenSet(opts);
    const result2 = generateTokenSet(opts);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('does not mutate the preset in-place', () => {
    const result1 = generateTokenSet({ context: 'dashboard', brandColor: '#ff0000' });
    const result2 = generateTokenSet({ context: 'dashboard' });

    // Without structuredClone, the second call would inherit the brand color
    expect(result2.tokenSet.color.light.text.accent.value).not.toBe('#ff0000');
    expect(result1.tokenSet.color.light.text.accent.value).toBe('#ff0000');
  });
});
