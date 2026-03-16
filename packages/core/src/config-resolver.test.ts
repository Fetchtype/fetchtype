import { describe, expect, it } from 'vitest';

import { resolveConfig } from './config-resolver.js';

describe('resolveConfig', () => {
  it('returns config as-is when no extends is set', () => {
    const config = resolveConfig({ rules: { 'color.contrast': 'warning' } });
    expect(config.rules['color.contrast']).toBe('warning');
  });

  it('extending fetchtype:strict applies all error severities', () => {
    const config = resolveConfig({ extends: 'fetchtype:strict' });
    expect(config.rules['color.contrast']).toBe('error');
    expect(config.rules['font.availability']).toBe('error');
    expect(config.rules['policy.font-blocklist']).toBe('error');
  });

  it('extending fetchtype:strict sets tight performance thresholds', () => {
    const config = resolveConfig({ extends: 'fetchtype:strict' });
    expect(config.performance.maxFontCount).toBe(3);
    expect(config.performance.maxPreloadCount).toBe(2);
  });

  it('extending fetchtype:accessibility sets requiredSubsets', () => {
    const config = resolveConfig({ extends: 'fetchtype:accessibility' });
    expect(config.requiredSubsets).toEqual(['latin', 'latin-ext']);
  });

  it('extending fetchtype:accessibility sets AAA contrast rule with options', () => {
    const config = resolveConfig({ extends: 'fetchtype:accessibility' });
    expect(config.rules['color.contrast']).toEqual({ severity: 'error', options: { minRatio: 7 } });
  });

  it('local rules override extended rules', () => {
    const config = resolveConfig({
      extends: 'fetchtype:strict',
      rules: { 'color.contrast': 'warning' },
    });
    expect(config.rules['color.contrast']).toBe('warning');
    // Other strict rules remain
    expect(config.rules['font.availability']).toBe('error');
  });

  it('local rules are merged per-rule, not replaced entirely', () => {
    const config = resolveConfig({
      extends: 'fetchtype:strict',
      rules: { 'color.contrast': 'warning' },
    });
    // All other strict rules still present
    expect(Object.keys(config.rules).length).toBeGreaterThan(1);
    expect(config.rules['scale.descending']).toBe('error');
  });

  it('array extends merges in order — last wins', () => {
    // strict sets color.contrast to 'error', accessibility sets it to an object
    // accessibility comes after strict, so it wins
    const config = resolveConfig({
      extends: ['fetchtype:strict', 'fetchtype:accessibility'],
    });
    expect(config.rules['color.contrast']).toEqual({ severity: 'error', options: { minRatio: 7 } });
    // strict-only rules still present
    expect(config.rules['font.availability']).toBe('error');
    // accessibility requiredSubsets present
    expect(config.requiredSubsets).toEqual(['latin', 'latin-ext']);
  });

  it('array extends reversed — strict wins over accessibility for shared rules', () => {
    const config = resolveConfig({
      extends: ['fetchtype:accessibility', 'fetchtype:strict'],
    });
    // strict applies 'error' string (not object), overrides accessibility object
    expect(config.rules['color.contrast']).toBe('error');
  });

  it('throws a helpful error for unknown built-in profile', () => {
    expect(() =>
      resolveConfig({ extends: 'fetchtype:nonexistent' }),
    ).toThrow(/Unknown built-in profile/);
    expect(() =>
      resolveConfig({ extends: 'fetchtype:nonexistent' }),
    ).toThrow(/fetchtype:recommended/);
  });

  it('throws a helpful error for npm package extends', () => {
    expect(() =>
      resolveConfig({ extends: 'some-npm-package' }),
    ).toThrow(/npm package extends not yet supported/);
    expect(() =>
      resolveConfig({ extends: 'some-npm-package' }),
    ).toThrow(/fetchtype:recommended/);
  });

  it('handles fetchtype:recommended (empty rules, all defaults)', () => {
    const config = resolveConfig({ extends: 'fetchtype:recommended' });
    // recommended has empty rules object, so no rules set from base
    expect(config.rules).toEqual({});
  });

  it('deep merges performance — local overrides specific keys', () => {
    const config = resolveConfig({
      extends: 'fetchtype:strict',
      performance: { maxFontCount: 5 },
    });
    expect(config.performance.maxFontCount).toBe(5);
    // strict maxPreloadCount still present
    expect(config.performance.maxPreloadCount).toBe(2);
  });
});
