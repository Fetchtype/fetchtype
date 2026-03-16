/**
 * Platform-aware fallback CSS generator.
 *
 * Computes @font-face declarations with metric overrides (ascent-override,
 * descent-override, line-gap-override, size-adjust) for each rendering target.
 * This eliminates CLS (Cumulative Layout Shift) during font loading.
 */

import type { FontEntry, FontMetrics, RenderingTarget, FallbackTarget } from '@fetchtype/types';

// ---------------------------------------------------------------------------
// System font metrics (extracted from actual font files)
// ---------------------------------------------------------------------------

/** Metrics for system fonts used as fallbacks on each rendering target. */
export const SYSTEM_FALLBACK_METRICS: Record<
  RenderingTarget,
  Record<'sans-serif' | 'serif' | 'monospace', { font: string; localNames: string[]; metrics: FontMetrics }>
> = {
  apple: {
    'sans-serif': {
      font: 'Helvetica Neue',
      localNames: ['Helvetica Neue'],
      metrics: {
        unitsPerEm: 1000, ascent: 952, descent: -213, lineGap: 28,
        xHeight: 517, capHeight: 714, useTypoMetrics: false,
        hheaAscent: 952, hheaDescent: -213, winAscent: 975, winDescent: 217,
      },
    },
    serif: {
      font: 'Georgia',
      localNames: ['Georgia'],
      metrics: {
        unitsPerEm: 2048, ascent: 1878, descent: -449, lineGap: 0,
        xHeight: 986, capHeight: 1419, useTypoMetrics: true,
        hheaAscent: 1878, hheaDescent: -449, winAscent: 1878, winDescent: 449,
      },
    },
    monospace: {
      font: 'Menlo',
      localNames: ['Menlo'],
      metrics: {
        unitsPerEm: 2048, ascent: 1901, descent: -483, lineGap: 0,
        xHeight: 1120, capHeight: 1493, useTypoMetrics: true,
        hheaAscent: 1901, hheaDescent: -483, winAscent: 1901, winDescent: 483,
      },
    },
  },
  windows: {
    'sans-serif': {
      font: 'Segoe UI',
      localNames: ['Segoe UI Variable', 'Segoe UI'],
      metrics: {
        unitsPerEm: 2048, ascent: 2210, descent: -514, lineGap: 0,
        xHeight: 1024, capHeight: 1434, useTypoMetrics: true,
        hheaAscent: 2210, hheaDescent: -514, winAscent: 2210, winDescent: 514,
      },
    },
    serif: {
      font: 'Times New Roman',
      localNames: ['Times New Roman'],
      metrics: {
        unitsPerEm: 2048, ascent: 1825, descent: -443, lineGap: 87,
        xHeight: 916, capHeight: 1356, useTypoMetrics: false,
        hheaAscent: 1825, hheaDescent: -443, winAscent: 2000, winDescent: 454,
      },
    },
    monospace: {
      font: 'Consolas',
      localNames: ['Cascadia Mono', 'Consolas'],
      metrics: {
        unitsPerEm: 2048, ascent: 1884, descent: -514, lineGap: 0,
        xHeight: 1064, capHeight: 1462, useTypoMetrics: true,
        hheaAscent: 1884, hheaDescent: -514, winAscent: 2048, winDescent: 514,
      },
    },
  },
  android: {
    'sans-serif': {
      font: 'Roboto',
      localNames: ['Roboto'],
      metrics: {
        unitsPerEm: 2048, ascent: 1900, descent: -500, lineGap: 0,
        xHeight: 1082, capHeight: 1456, useTypoMetrics: true,
        hheaAscent: 1900, hheaDescent: -500, winAscent: 1946, winDescent: 512,
      },
    },
    serif: {
      font: 'Noto Serif',
      localNames: ['Noto Serif'],
      metrics: {
        unitsPerEm: 1000, ascent: 1069, descent: -293, lineGap: 0,
        xHeight: null, capHeight: null, useTypoMetrics: true,
        hheaAscent: 1069, hheaDescent: -293, winAscent: 1069, winDescent: 293,
      },
    },
    monospace: {
      font: 'Roboto Mono',
      localNames: ['Roboto Mono'],
      metrics: {
        unitsPerEm: 2048, ascent: 2146, descent: -555, lineGap: 0,
        xHeight: null, capHeight: null, useTypoMetrics: true,
        hheaAscent: 2146, hheaDescent: -555, winAscent: 2146, winDescent: 555,
      },
    },
  },
  linux: {
    'sans-serif': {
      font: 'Noto Sans',
      localNames: ['Noto Sans'],
      metrics: {
        unitsPerEm: 1000, ascent: 1069, descent: -293, lineGap: 0,
        xHeight: 536, capHeight: 714, useTypoMetrics: true,
        hheaAscent: 1069, hheaDescent: -293, winAscent: 1069, winDescent: 293,
      },
    },
    serif: {
      font: 'Noto Serif',
      localNames: ['Noto Serif'],
      metrics: {
        unitsPerEm: 1000, ascent: 1069, descent: -293, lineGap: 0,
        xHeight: null, capHeight: null, useTypoMetrics: true,
        hheaAscent: 1069, hheaDescent: -293, winAscent: 1069, winDescent: 293,
      },
    },
    monospace: {
      font: 'Noto Sans Mono',
      localNames: ['Noto Sans Mono'],
      metrics: {
        unitsPerEm: 1000, ascent: 1069, descent: -293, lineGap: 0,
        xHeight: null, capHeight: null, useTypoMetrics: true,
        hheaAscent: 1069, hheaDescent: -293, winAscent: 1069, winDescent: 293,
      },
    },
  },
  universal: {
    'sans-serif': {
      font: 'Arial',
      localNames: ['Arial'],
      metrics: {
        unitsPerEm: 2048, ascent: 1854, descent: -434, lineGap: 67,
        xHeight: 1062, capHeight: 1467, useTypoMetrics: false,
        hheaAscent: 1854, hheaDescent: -434, winAscent: 2007, winDescent: 435,
      },
    },
    serif: {
      font: 'Times New Roman',
      localNames: ['Times New Roman'],
      metrics: {
        unitsPerEm: 2048, ascent: 1825, descent: -443, lineGap: 87,
        xHeight: 916, capHeight: 1356, useTypoMetrics: false,
        hheaAscent: 1825, hheaDescent: -443, winAscent: 2000, winDescent: 454,
      },
    },
    monospace: {
      font: 'Courier New',
      localNames: ['Courier New'],
      metrics: {
        unitsPerEm: 2048, ascent: 1705, descent: -615, lineGap: 0,
        xHeight: 846, capHeight: 1297, useTypoMetrics: true,
        hheaAscent: 1705, hheaDescent: -615, winAscent: 1705, winDescent: 615,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Override computation
// ---------------------------------------------------------------------------

/**
 * Get the effective ascent/descent/lineGap for a font, considering
 * the useTypoMetrics flag and the rendering target.
 */
function getEffectiveMetrics(
  m: FontMetrics,
  target: RenderingTarget,
): { ascent: number; descent: number; lineGap: number; unitsPerEm: number } {
  // When USE_TYPO_METRICS is set, all platforms use sTypo values
  if (m.useTypoMetrics) {
    return { ascent: m.ascent, descent: m.descent, lineGap: m.lineGap, unitsPerEm: m.unitsPerEm };
  }

  // When not set, macOS/iOS use hhea, Windows uses win metrics
  if (target === 'apple') {
    return {
      ascent: m.hheaAscent ?? m.ascent,
      descent: m.hheaDescent ?? m.descent,
      lineGap: m.lineGap,
      unitsPerEm: m.unitsPerEm,
    };
  }

  if (target === 'windows') {
    return {
      ascent: m.winAscent ?? m.ascent,
      descent: -(m.winDescent ?? Math.abs(m.descent)),
      lineGap: 0,
      unitsPerEm: m.unitsPerEm,
    };
  }

  // Android/Linux/universal — use typo values as best guess
  return { ascent: m.ascent, descent: m.descent, lineGap: m.lineGap, unitsPerEm: m.unitsPerEm };
}

/** Format a number as a CSS percentage with 2 decimal places. */
function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export type CSSOverrides = {
  ascentOverride: string;
  descentOverride: string;
  lineGapOverride: string;
  sizeAdjust: string;
};

/**
 * Compute fallback metric overrides for a target font against a fallback font.
 *
 * The overrides make the fallback font occupy the same vertical space as the
 * target font, eliminating CLS when the web font loads.
 */
export function computeFallbackOverrides(
  targetMetrics: FontMetrics,
  fallbackMetrics: FontMetrics,
  target: RenderingTarget,
): CSSOverrides {
  const t = getEffectiveMetrics(targetMetrics, target);
  const f = getEffectiveMetrics(fallbackMetrics, target);

  // Vertical overrides are expressed as percentages of the used font size.
  // They tell the browser what metrics to apply to the fallback font so
  // its line box matches the target font.
  const ascentOverride = t.ascent / t.unitsPerEm;
  const descentOverride = Math.abs(t.descent) / t.unitsPerEm;
  const lineGapOverride = t.lineGap / t.unitsPerEm;

  // size-adjust corrects horizontal advance width differences.
  // Without avgCharWidth data, we approximate using ascent+|descent| ratio.
  const targetTotal = t.ascent + Math.abs(t.descent) + t.lineGap;
  const fallbackTotal = f.ascent + Math.abs(f.descent) + f.lineGap;
  const sizeAdjust = (fallbackTotal / f.unitsPerEm) / (targetTotal / t.unitsPerEm);

  return {
    ascentOverride: pct(ascentOverride),
    descentOverride: pct(descentOverride),
    lineGapOverride: pct(lineGapOverride),
    sizeAdjust: pct(sizeAdjust),
  };
}

// ---------------------------------------------------------------------------
// Fallback target computation
// ---------------------------------------------------------------------------

function categoryToGeneric(category: string): 'sans-serif' | 'serif' | 'monospace' {
  if (category === 'monospace') return 'monospace';
  if (category === 'serif') return 'serif';
  return 'sans-serif';
}

const TARGETS: RenderingTarget[] = ['windows', 'apple', 'android', 'linux', 'universal'];

/**
 * Compute fallback targets for a font entry against all 5 rendering targets.
 */
export function computeFallbackTargets(entry: FontEntry): FallbackTarget[] {
  const generic = categoryToGeneric(entry.category);

  return TARGETS.map(target => {
    const fb = SYSTEM_FALLBACK_METRICS[target][generic];
    const overrides = computeFallbackOverrides(entry.metrics, fb.metrics, target);

    return {
      target,
      fallbackFont: fb.font,
      localNames: fb.localNames,
      overrides,
    };
  });
}

/**
 * Check if a font requires platform-specific fallback splits.
 *
 * When USE_TYPO_METRICS is set (~90% of fonts), all platforms use the same
 * metric tables and the vertical overrides are identical. Only size-adjust varies.
 */
export function requiresPlatformSplit(metrics: FontMetrics): boolean {
  return !metrics.useTypoMetrics;
}

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

export type FallbackCSSOptions = {
  /** Wrap in @supports (overflow-anchor: auto) to exclude Safari */
  safariWrap?: boolean;
  /** Use compact single @font-face instead of per-target */
  compact?: boolean;
  /** Include font-family stack declaration */
  includeStack?: boolean;
  /** CSS selector for the font-family declaration */
  selector?: string;
};

/**
 * Generate platform-aware fallback CSS for a font entry.
 *
 * Returns the complete CSS with per-rendering-target @font-face blocks
 * and optional font-family stack.
 */
export function generateFallbackCSS(entry: FontEntry, options: FallbackCSSOptions = {}): string {
  const {
    safariWrap = true,
    compact = false,
    includeStack = true,
    selector = 'body',
  } = options;

  const targets = entry.fallback.targets.length > 0
    ? entry.fallback.targets
    : computeFallbackTargets(entry);

  const generic = categoryToGeneric(entry.category);
  const lines: string[] = [];

  if (compact && !requiresPlatformSplit(entry.metrics)) {
    // Compact mode: single @font-face with combined local() sources
    const allLocalNames = targets.flatMap(t => t.localNames);
    const universalTarget = targets.find(t => t.target === 'universal') ?? targets[0]!;
    const localSrc = allLocalNames.map(n => `local("${n}")`).join(', ');

    const block = [
      `@font-face {`,
      `  font-family: "${entry.family} Fallback";`,
      `  src: ${localSrc};`,
      `  ascent-override: ${universalTarget.overrides.ascentOverride};`,
      `  descent-override: ${universalTarget.overrides.descentOverride};`,
      `  line-gap-override: ${universalTarget.overrides.lineGapOverride};`,
      `  size-adjust: ${universalTarget.overrides.sizeAdjust};`,
      `}`,
    ].join('\n');

    if (safariWrap) {
      lines.push(`/* Safari exclusion — overflow-anchor is not supported in Safari */`);
      lines.push(`@supports (overflow-anchor: auto) {`);
      lines.push(block.split('\n').map(l => `  ${l}`).join('\n'));
      lines.push(`}`);
    } else {
      lines.push(block);
    }
  } else {
    // Full mode: per-target @font-face blocks
    const targetBlocks = targets.map(t => {
      const targetLabel = t.target.charAt(0).toUpperCase() + t.target.slice(1);
      const fallbackName = t.target === 'universal'
        ? `${entry.family} Fallback`
        : `${entry.family} Fallback ${targetLabel}`;
      const localSrc = t.localNames.map(n => `local("${n}")`).join(', ');

      return [
        `/* ${targetLabel} target — ${t.fallbackFont} */`,
        `@font-face {`,
        `  font-family: "${fallbackName}";`,
        `  src: ${localSrc};`,
        `  ascent-override: ${t.overrides.ascentOverride};`,
        `  descent-override: ${t.overrides.descentOverride};`,
        `  line-gap-override: ${t.overrides.lineGapOverride};`,
        `  size-adjust: ${t.overrides.sizeAdjust};`,
        `}`,
      ].join('\n');
    });

    if (safariWrap) {
      lines.push(`/* Generated by fetchtype — platform-aware fallback CSS */`);
      lines.push(`/* Safari exclusion — overflow-anchor is not supported in Safari */`);
      lines.push(`@supports (overflow-anchor: auto) {`);
      for (const block of targetBlocks) {
        lines.push(block.split('\n').map(l => `  ${l}`).join('\n'));
        lines.push('');
      }
      lines.push(`}`);
    } else {
      lines.push(`/* Generated by fetchtype — platform-aware fallback CSS */`);
      for (const block of targetBlocks) {
        lines.push(block);
        lines.push('');
      }
    }
  }

  if (includeStack) {
    lines.push('');
    const fallbackNames = compact
      ? [`"${entry.family} Fallback"`]
      : targets
          .filter(t => t.target !== 'universal')
          .map(t => `"${entry.family} Fallback ${t.target.charAt(0).toUpperCase() + t.target.slice(1)}"`)
          .concat([`"${entry.family} Fallback"`]);

    lines.push(`${selector} {`);
    lines.push(`  font-family:`);
    lines.push(`    ${entry.family},`);
    for (let i = 0; i < fallbackNames.length; i++) {
      lines.push(`    ${fallbackNames[i]},`);
    }
    lines.push(`    ${generic};`);
    lines.push(`}`);
  }

  return lines.join('\n');
}
