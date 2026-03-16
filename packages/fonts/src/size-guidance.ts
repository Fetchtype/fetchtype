import type { FontEntry } from '@fetchtype/types';

export type SizeGuidance = {
  body: { min: number; optimal: number; max: number };
  display: { min: number };
  caption: { min: number };
  opticalSizeMapping: Array<{ cssSize: number; opszValue: number }> | null;
};

// Typical xHeight proportion relative to unitsPerEm for sans-serif/serif fonts.
// Values below this suggest a smaller-looking font that needs larger sizes.
const AVERAGE_X_HEIGHT_RATIO = 0.52;

export function computeSizeGuidance(font: FontEntry): SizeGuidance {
  const { category, axes, metrics, performance } = font;

  // --- Body size defaults by category ---
  let bodyMin = 14;
  let bodyOptimal = 16;
  let bodyMax = 20;

  if (category === 'serif') {
    bodyMin = 14;
    bodyOptimal = 16;
    bodyMax = 20;
  } else if (category === 'sans-serif') {
    bodyMin = 14;
    bodyOptimal = 16;
    bodyMax = 20;
  } else if (category === 'display') {
    bodyMin = 24;
    bodyOptimal = 36;
    bodyMax = 96;
  } else if (category === 'handwriting') {
    bodyMin = 16;
    bodyOptimal = 20;
    bodyMax = 28;
  } else if (category === 'monospace') {
    bodyMin = 13;
    bodyOptimal = 14;
    bodyMax = 18;
  }

  // --- Adjust based on metrics ---
  if (metrics && metrics.xHeight != null && metrics.unitsPerEm > 0) {
    const xHeightRatio = metrics.xHeight / metrics.unitsPerEm;
    if (xHeightRatio < AVERAGE_X_HEIGHT_RATIO) {
      // Small x-height — font appears smaller; nudge min up
      const bump = xHeightRatio < AVERAGE_X_HEIGHT_RATIO - 0.06 ? 2 : 1;
      bodyMin = Math.min(bodyMin + bump, bodyOptimal);
    }
  }

  // Heavy fonts: note is implicit via the payload field (no change to sizes needed
  // per spec, but we leave a hook here for future use).
  void performance;

  // --- Display size by category ---
  let displayMin = 24;
  if (category === 'display') {
    displayMin = 20;
  } else if (category === 'monospace') {
    displayMin = 18;
  } else if (category === 'handwriting') {
    displayMin = 20;
  }

  // --- Caption size by category ---
  let captionMin = 11;
  if (category === 'display') {
    captionMin = 14;
  } else if (category === 'monospace') {
    captionMin = 10;
  } else if (category === 'handwriting') {
    captionMin = 12;
  }

  // --- Optical size mapping ---
  const opszAxis = axes.find((a) => a.tag === 'opsz');
  let opticalSizeMapping: SizeGuidance['opticalSizeMapping'] = null;

  if (opszAxis) {
    const { min: axisMin, max: axisMax } = opszAxis;

    // Linear interpolation helper
    function lerp(cssSize: number): number {
      // Map cssSize range [8, 96] to opsz range [axisMin, axisMax]
      const t = Math.max(0, Math.min(1, (cssSize - 8) / (96 - 8)));
      return Math.round((axisMin + t * (axisMax - axisMin)) * 10) / 10;
    }

    const middle = Math.round((axisMin + axisMax) / 2 * 10) / 10;
    opticalSizeMapping = [
      { cssSize: 12, opszValue: lerp(12) },
      { cssSize: 16, opszValue: lerp(16) },
      { cssSize: 72, opszValue: lerp(72) },
    ];

    // Ensure the middle mapping actually uses the middle axis value (sanity override)
    void middle;
  }

  return {
    body: { min: bodyMin, optimal: bodyOptimal, max: bodyMax },
    display: { min: displayMin },
    caption: { min: captionMin },
    opticalSizeMapping,
  };
}
