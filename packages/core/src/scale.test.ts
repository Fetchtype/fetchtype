import { describe, expect, it } from 'vitest';

import { computeHeadingSizes, SCALE_RATIOS } from './scale.js';

describe('computeHeadingSizes', () => {
  it('computes heading sizes with major-third ratio', () => {
    const sizes = computeHeadingSizes(16, 1.25);

    expect(sizes.h6).toBe(16);
    expect(sizes.h5).toBeCloseTo(20, 1);
    expect(sizes.h4).toBeCloseTo(25, 1);
    expect(sizes.h3).toBeCloseTo(31.25, 1);
    expect(sizes.h2).toBeCloseTo(39.0625, 1);
    expect(sizes.h1).toBeCloseTo(48.828, 0);
  });

  it('computes heading sizes with minor-second ratio', () => {
    const ratio = SCALE_RATIOS['minor-second']!;
    const sizes = computeHeadingSizes(14, ratio);

    expect(sizes.h6).toBe(14);
    expect(sizes.h5).toBeCloseTo(14 * ratio, 2);
    expect(sizes.h4).toBeCloseTo(14 * ratio ** 2, 2);
    expect(sizes.h3).toBeCloseTo(14 * ratio ** 3, 2);
    expect(sizes.h2).toBeCloseTo(14 * ratio ** 4, 2);
    expect(sizes.h1).toBeCloseTo(14 * ratio ** 5, 2);
  });

  it('produces h1 > h2 > h3 > h4 > h5 > h6', () => {
    const sizes = computeHeadingSizes(16, 1.2);

    expect(sizes.h1).toBeGreaterThan(sizes.h2);
    expect(sizes.h2).toBeGreaterThan(sizes.h3);
    expect(sizes.h3).toBeGreaterThan(sizes.h4);
    expect(sizes.h4).toBeGreaterThan(sizes.h5);
    expect(sizes.h5).toBeGreaterThan(sizes.h6);
  });

  it('has the expected named ratios', () => {
    expect(SCALE_RATIOS['minor-second']).toBe(1.067);
    expect(SCALE_RATIOS['major-second']).toBe(1.125);
    expect(SCALE_RATIOS['minor-third']).toBe(1.2);
    expect(SCALE_RATIOS['major-third']).toBe(1.25);
    expect(SCALE_RATIOS['perfect-fourth']).toBe(1.333);
    expect(SCALE_RATIOS['perfect-fifth']).toBe(1.5);
  });
});
