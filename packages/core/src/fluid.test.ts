import { describe, expect, it } from 'vitest';
import { generateFluidType } from './fluid.js';
import { DEFAULT_TOKEN_SET } from './presets.js';

describe('generateFluidType', () => {
  it('generates fluid CSS from default tokens', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET);
    expect(result.css).toContain(':root');
    expect(result.css).toContain('clamp(');
    expect(result.values.length).toBeGreaterThan(0);
  });

  it('generates fluid values for body font size', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET);
    const bodySize = result.values.find(v => v.context === 'body' && v.property === 'fontSize');
    expect(bodySize).toBeDefined();
    expect(bodySize!.clamp).toMatch(/^clamp\(/);
  });

  it('generates fluid heading sizes', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET);
    const h1 = result.values.find(v => v.context === 'h1' && v.property === 'fontSize');
    expect(h1).toBeDefined();
    expect(h1!.clamp).toMatch(/^clamp\(/);
  });

  it('respects custom viewport range', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET, {
      minWidth: 400,
      maxWidth: 1600,
    });
    expect(result.explanation).toContain('Fluid type scale: 400px → 1600px viewport');
  });

  it('respects custom min scale', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET, { minScale: 0.5 });
    expect(result.explanation).toContain('Mobile sizes scaled to 50% of desktop');
  });

  it('generates fluid spacing', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET);
    expect(result.css).toContain('--ft-fluid-spacing-');
  });

  it('returns explanation array', () => {
    const result = generateFluidType(DEFAULT_TOKEN_SET);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanation.some(e => e.includes('fluid values'))).toBe(true);
  });

  it('handles tokens without typography gracefully', () => {
    const result = generateFluidType({} as any);
    expect(result.values).toHaveLength(0);
  });
});
