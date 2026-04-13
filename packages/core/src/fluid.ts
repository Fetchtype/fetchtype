/**
 * Fluid Type Scale — Auto-generates CSS clamp() formulas for responsive typography.
 *
 * Takes a token set and produces fluid type values that smoothly scale
 * between mobile and desktop viewport widths. The #1 thing developers
 * struggle with in responsive typography.
 */

import type { DesignTokenSet } from '@fetchtype/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FluidConfig = {
  /** Minimum viewport width in px (default: 320) */
  minWidth?: number;
  /** Maximum viewport width in px (default: 1280) */
  maxWidth?: number;
  /** Scale factor for min sizes relative to max (default: 0.75 = 75% of desktop size) */
  minScale?: number;
  /** Whether to include line-height fluid values (default: true) */
  fluidLineHeight?: boolean;
};

export type FluidValue = {
  context: string;
  property: string;
  min: string;
  max: string;
  clamp: string;
  preferred: string;
};

export type FluidTypeResult = {
  values: FluidValue[];
  css: string;
  explanation: string[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseToRem(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = value.match(/^([\d.]+)\s*(px|rem|em)?$/);
  if (!match) return 1;
  const num = parseFloat(match[1]!);
  const unit = match[2];
  if (unit === 'px') return num / 16;
  return num; // rem/em or unitless
}

function round(n: number, decimals = 4): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

/**
 * Generate a CSS clamp() formula.
 *
 * clamp(min, preferred, max) where preferred = minVal + (maxVal - minVal) * slope
 * slope = (maxVal - minVal) / (maxVw - minVw) expressed in vw
 */
function generateClamp(
  minVal: number,
  maxVal: number,
  minVw: number,
  maxVw: number,
  unit: 'rem' | 'px' = 'rem',
): { clamp: string; preferred: string } {
  if (minVal === maxVal) {
    return { clamp: `${round(maxVal)}${unit}`, preferred: `${round(maxVal)}${unit}` };
  }

  // Calculate slope and intercept
  // preferred = intercept + slope * 100vw
  const slope = (maxVal - minVal) / (maxVw - minVw);
  const intercept = minVal - slope * minVw;

  const slopeVw = round(slope * 100, 4);
  const interceptRem = round(unit === 'rem' ? intercept : intercept / 16, 4);

  const minStr = `${round(minVal)}${unit}`;
  const maxStr = `${round(maxVal)}${unit}`;

  const absIntercept = Math.abs(interceptRem);
  const preferred = interceptRem >= 0
    ? `${absIntercept}rem + ${slopeVw}vw`
    : `-${absIntercept}rem + ${slopeVw}vw`;

  return {
    clamp: `clamp(${minStr}, ${preferred}, ${maxStr})`,
    preferred,
  };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function generateFluidType(
  tokens: DesignTokenSet,
  config: FluidConfig = {},
): FluidTypeResult {
  const {
    minWidth = 320,
    maxWidth = 1280,
    minScale = 0.75,
    fluidLineHeight = true,
  } = config;

  const values: FluidValue[] = [];
  const explanation: string[] = [];
  const cssLines: string[] = [];

  explanation.push(
    `Fluid type scale: ${minWidth}px → ${maxWidth}px viewport`,
    `Mobile sizes scaled to ${Math.round(minScale * 100)}% of desktop`,
  );

  cssLines.push(':root {');

  // Process each typography context
  const typography = tokens.typography;
  if (!typography) {
    return { values: [], css: '', explanation: ['No typography tokens found'] };
  }

  const contexts = Object.entries(typography).filter(
    ([, v]) => v && typeof v === 'object' && 'fontSize' in v,
  );

  for (const [contextName, context] of contexts) {
    if (!context || typeof context !== 'object') continue;

    // Font size — always make fluid
    const fontSize = (context as any).fontSize;
    if (fontSize) {
      const maxRem = parseToRem(fontSize);
      const minRem = round(maxRem * minScale);

      // Don't let body text go below ~14px (0.875rem)
      const floorRem = contextName === 'body' ? 0.875 : contextName === 'caption' ? 0.6875 : 0.625;
      const safeMinRem = Math.max(minRem, floorRem);

      const { clamp, preferred } = generateClamp(safeMinRem, maxRem, minWidth, maxWidth);

      values.push({
        context: contextName,
        property: 'fontSize',
        min: `${safeMinRem}rem`,
        max: `${maxRem}rem`,
        clamp,
        preferred,
      });

      cssLines.push(`  --ft-fluid-${contextName}-font-size: ${clamp};`);
    }

    // Line height — subtle fluid adjustment (tighter on mobile)
    const lineHeight = (context as any).lineHeight;
    if (fluidLineHeight && typeof lineHeight === 'number' && lineHeight > 1) {
      // Headings: keep tight on both ends. Body: slightly tighter on mobile.
      const isHeading = ['heading', 'subheading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(contextName);
      const lhReduction = isHeading ? 0.02 : 0.05;
      const minLh = round(Math.max(1, lineHeight - lhReduction));
      const maxLh = lineHeight;

      if (minLh !== maxLh) {
        const { clamp } = generateClamp(minLh, maxLh, minWidth, maxWidth);
        values.push({
          context: contextName,
          property: 'lineHeight',
          min: String(minLh),
          max: String(maxLh),
          clamp,
          preferred: clamp,
        });
        cssLines.push(`  --ft-fluid-${contextName}-line-height: ${clamp};`);
      }
    }
  }

  // Heading hierarchy — fluid sizes
  const headings = tokens.hierarchy?.headings;
  if (headings) {
    for (const [level, heading] of Object.entries(headings)) {
      if (!heading?.fontSize) continue;
      const maxRem = parseToRem(heading.fontSize);
      // Headings scale down more aggressively than body text
      const headingScale = level === 'h1' ? 0.6 : level === 'h2' ? 0.65 : level === 'h3' ? 0.7 : minScale;
      const minRem = round(Math.max(1, maxRem * headingScale));

      const { clamp, preferred } = generateClamp(minRem, maxRem, minWidth, maxWidth);

      values.push({
        context: level,
        property: 'fontSize',
        min: `${minRem}rem`,
        max: `${maxRem}rem`,
        clamp,
        preferred,
      });

      cssLines.push(`  --ft-fluid-${level}-font-size: ${clamp};`);
    }
  }

  // Spacing — fluid
  const spacing = tokens.spacing?.scale;
  if (spacing) {
    cssLines.push('');
    cssLines.push('  /* Fluid spacing */');
    for (const [name, value] of Object.entries(spacing)) {
      const maxRem = parseToRem(String(value));
      const minRem = round(maxRem * 0.75);
      if (maxRem > 0.25) {
        const { clamp } = generateClamp(minRem, maxRem, minWidth, maxWidth);
        cssLines.push(`  --ft-fluid-spacing-${name}: ${clamp};`);
      }
    }
  }

  cssLines.push('}');

  explanation.push(
    `Generated ${values.length} fluid values`,
    'Body text floored at 14px minimum',
    'Headings scale more aggressively (h1 to 60% on mobile)',
    'Line-heights subtly tighten on smaller viewports',
  );

  return {
    values,
    css: cssLines.join('\n'),
    explanation,
  };
}
