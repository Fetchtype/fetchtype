import { describe, expect, it } from 'vitest';

import { DEFAULT_TOKEN_SET, resolveDesignTokenSet } from '../index.js';
import { generateShadcnCss, hexToHslValues } from './shadcn.js';

describe('hexToHslValues', () => {
  it('converts white correctly', () => {
    expect(hexToHslValues('#ffffff')).toBe('0 0% 100%');
  });

  it('converts black correctly', () => {
    expect(hexToHslValues('#000000')).toBe('0 0% 0%');
  });

  it('converts pure red correctly', () => {
    const result = hexToHslValues('#ff0000');
    expect(result).toBe('0 100% 50%');
  });

  it('handles 3-digit hex shorthand', () => {
    const result = hexToHslValues('#fff');
    expect(result).toBe('0 0% 100%');
  });

  it('returns null for invalid hex', () => {
    expect(hexToHslValues('not-a-color')).toBeNull();
    expect(hexToHslValues('#gg0000')).toBeNull();
  });
});

describe('generateShadcnCss', () => {
  const resolved = resolveDesignTokenSet(DEFAULT_TOKEN_SET);

  it('contains --background and --foreground variables', () => {
    const css = generateShadcnCss(resolved);

    expect(css).toContain('--background:');
    expect(css).toContain('--foreground:');
  });

  it('generates a .dark block', () => {
    const css = generateShadcnCss(resolved);

    expect(css).toContain('.dark {');
    // dark block should also have variables
    const darkSection = css.slice(css.indexOf('.dark {'));
    expect(darkSection).toContain('--background:');
    expect(darkSection).toContain('--foreground:');
  });

  it('maps primary from interactive.default', () => {
    const css = generateShadcnCss(resolved);

    expect(css).toContain('--primary:');
    expect(css).toContain('--primary-foreground:');
  });

  it('includes --border and --input variables', () => {
    const css = generateShadcnCss(resolved);

    expect(css).toContain('--border:');
    expect(css).toContain('--input:');
  });

  it('includes --radius', () => {
    const css = generateShadcnCss(resolved);

    expect(css).toContain('--radius: 0.5rem');
  });

  it('outputs HSL values without hsl() wrapper', () => {
    const css = generateShadcnCss(resolved);

    // Variables should not contain "hsl("
    expect(css).not.toContain('hsl(');
    // But should contain percentage signs from HSL values
    expect(css).toContain('%');
  });

  it('supports a custom prefix', () => {
    const css = generateShadcnCss(resolved, { prefix: 'ui' });

    expect(css).toContain('--ui-background:');
    expect(css).toContain('--ui-foreground:');
    expect(css).toContain('--ui-radius:');
  });
});
