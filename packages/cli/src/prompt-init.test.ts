import { describe, expect, it } from 'vitest';

import { resolvePromptToTokenSet } from './prompt-init.js';
import { getPreset } from '@fetchtype/core';

describe('resolvePromptToTokenSet', () => {
  it('selects dashboard preset for "dashboard" prompt', () => {
    const result = resolvePromptToTokenSet('dashboard app');
    const expected = getPreset('dashboard')!;
    expect(result.tokenSet.spacing).toEqual(expected.spacing);
    expect(result.reasoning).toContain('dashboard');
  });

  it('selects editorial preset for "editorial blog"', () => {
    const result = resolvePromptToTokenSet('editorial blog');
    const expected = getPreset('editorial')!;
    expect(result.tokenSet.spacing).toEqual(expected.spacing);
    expect(result.reasoning).toContain('editorial');
  });

  it('selects base preset for "modern SaaS"', () => {
    const result = resolvePromptToTokenSet('modern SaaS');
    const expected = getPreset('base')!;
    // Modern doesn't change fonts (keeps Inter), so typography should match base
    expect(result.tokenSet.layout).toEqual(expected.layout);
    expect(result.reasoning).toContain('base');
  });

  it('applies compact modifier to reduce spacing', () => {
    const result = resolvePromptToTokenSet('compact interface');
    expect(result.tokenSet.spacing.scale['xl']).toBe('1rem');
    expect(result.tokenSet.spacing.scale['2xl']).toBe('1.5rem');
    expect(result.reasoning).toContain('compact');
  });

  it('applies spacious modifier to increase line-height', () => {
    const result = resolvePromptToTokenSet('spacious website');
    expect(result.tokenSet.typography.body!.lineHeight).toBe(1.9);
    expect(result.tokenSet.spacing.scale['xl']).toBe('2rem');
    expect(result.reasoning).toContain('spacious');
  });

  it('falls back to base preset for unknown prompt', () => {
    const result = resolvePromptToTokenSet('something completely random');
    const expected = getPreset('base')!;
    expect(result.tokenSet.layout).toEqual(expected.layout);
    expect(result.reasoning).toContain('base');
  });

  it('returns non-empty reasoning string', () => {
    const result = resolvePromptToTokenSet('a website');
    expect(result.reasoning).toBeTruthy();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('selects docs preset for "documentation" prompt', () => {
    const result = resolvePromptToTokenSet('technical documentation site');
    const expected = getPreset('docs')!;
    expect(result.tokenSet.spacing).toEqual(expected.spacing);
    expect(result.reasoning).toContain('docs');
  });

  it('selects ecommerce preset for "shop" prompt', () => {
    const result = resolvePromptToTokenSet('online shop');
    const expected = getPreset('ecommerce')!;
    expect(result.tokenSet.spacing).toEqual(expected.spacing);
    expect(result.reasoning).toContain('ecommerce');
  });

  it('applies serif modifier for "classic" prompt', () => {
    const result = resolvePromptToTokenSet('classic elegant website');
    expect(result.tokenSet.typography.heading!.fontFamily).toContain('Georgia');
    expect(result.reasoning).toContain('serif');
  });

  it('applies monospace modifier for "terminal" prompt', () => {
    const result = resolvePromptToTokenSet('terminal-style interface');
    expect(result.tokenSet.typography.body!.fontFamily).toContain('monospace');
    expect(result.reasoning).toContain('monospace');
  });

  it('applies high contrast modifier', () => {
    const result = resolvePromptToTokenSet('high contrast dashboard');
    expect(result.tokenSet.color.light.text.primary.value).toBe('#000000');
    expect(result.tokenSet.color.dark.text.primary.value).toBe('#ffffff');
    expect(result.reasoning).toContain('high contrast');
  });
});
