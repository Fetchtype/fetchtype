import type { TypographyContext } from '@fetchtype/types';
import { parseDesignTokenSet } from './index.js';

export type DriftChangeKind = 'breaking' | 'non-breaking' | 'improvement';

export type DriftChange = {
  kind: DriftChangeKind;
  category: string;
  path: string;
  description: string;
  baseline: string | undefined;
  current: string | undefined;
};

export type DriftReport = {
  breaking: DriftChange[];
  nonBreaking: DriftChange[];
  improvements: DriftChange[];
  summary: string;
};

// --- Helpers ---

/**
 * Parse a CSS length string like "16px", "1rem", "clamp(14px,2vw,24px)" into
 * a pixel value. Returns NaN when parsing fails.
 *
 * We take the minimum of clamp() as the effective minimum size.
 */
function parsePx(value: string): number {
  if (typeof value !== 'string') return NaN;

  // Handle clamp(min, preferred, max) — take the min
  const clampMatch = value.match(/^clamp\(\s*([^,]+),/);
  if (clampMatch) {
    return parsePx(clampMatch[1]!.trim());
  }

  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]!);

  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]!) * 16;

  const emMatch = value.match(/^([\d.]+)em$/);
  if (emMatch) return parseFloat(emMatch[1]!) * 16;

  return NaN;
}

function normalizeFontFamily(ff: string | string[]): string {
  return Array.isArray(ff) ? ff[0] ?? '' : ff;
}

function primaryFont(ff: string | string[]): string {
  const primary = normalizeFontFamily(ff);
  return primary.trim().replace(/['"]/g, '');
}

function makeChange(
  kind: DriftChangeKind,
  category: string,
  path: string,
  description: string,
  baseline: string | undefined,
  current: string | undefined,
): DriftChange {
  return { kind, category, path, description, baseline, current };
}

// --- Main detector ---

export function detectDrift(baselineRaw: unknown, currentRaw: unknown): DriftReport {
  const baseline = parseDesignTokenSet(baselineRaw);
  const current = parseDesignTokenSet(currentRaw);

  const breaking: DriftChange[] = [];
  const nonBreaking: DriftChange[] = [];
  const improvements: DriftChange[] = [];

  // ── Typography contexts ──
  const allContexts = new Set([
    ...Object.keys(baseline.typography),
    ...Object.keys(current.typography),
  ]);

  for (const ctx of allContexts) {
    const base = baseline.typography[ctx as TypographyContext];
    const curr = current.typography[ctx as TypographyContext];

    if (!base && curr) {
      // New context added
      improvements.push(
        makeChange(
          'improvement',
          'font',
          `typography.${ctx}`,
          `New typography context "${ctx}" added`,
          undefined,
          String(curr.fontSize),
        ),
      );
      continue;
    }

    if (base && !curr) {
      // Context removed — this is breaking
      breaking.push(
        makeChange(
          'breaking',
          'font',
          `typography.${ctx}`,
          `Typography context "${ctx}" removed`,
          String(base.fontSize),
          undefined,
        ),
      );
      continue;
    }

    if (!base || !curr) continue;

    // Font family changed
    const baseFamily = primaryFont(base.fontFamily);
    const currFamily = primaryFont(curr.fontFamily);
    if (baseFamily.toLowerCase() !== currFamily.toLowerCase()) {
      breaking.push(
        makeChange(
          'breaking',
          'font',
          `typography.${ctx}.fontFamily`,
          `Font family changed from "${baseFamily}" to "${currFamily}" in context "${ctx}"`,
          baseFamily,
          currFamily,
        ),
      );
    }

    // Font size changes
    const basePx = parsePx(base.fontSize);
    const currPx = parsePx(curr.fontSize);
    if (!Number.isNaN(basePx) && !Number.isNaN(currPx) && basePx !== currPx) {
      const pct = ((currPx - basePx) / basePx) * 100;
      const absPct = Math.abs(pct);
      const pctStr = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;

      // Body font decreased below 14px — breaking
      if (ctx === 'body' && currPx < 14) {
        breaking.push(
          makeChange(
            'breaking',
            'scale',
            `typography.${ctx}.fontSize`,
            `Body font size decreased below 14px (now ${currPx}px, was ${basePx}px)`,
            base.fontSize,
            curr.fontSize,
          ),
        );
      } else if (absPct <= 20) {
        nonBreaking.push(
          makeChange(
            'non-breaking',
            'scale',
            `typography.${ctx}.fontSize`,
            `Font size in "${ctx}" changed from ${base.fontSize} to ${curr.fontSize} (${pctStr})`,
            base.fontSize,
            curr.fontSize,
          ),
        );
      } else {
        // Large size change > 20%
        breaking.push(
          makeChange(
            'breaking',
            'scale',
            `typography.${ctx}.fontSize`,
            `Font size in "${ctx}" changed by more than 20%: ${base.fontSize} → ${curr.fontSize} (${pctStr})`,
            base.fontSize,
            curr.fontSize,
          ),
        );
      }
    }

    // Letter spacing changes
    if (
      base.letterSpacing !== undefined &&
      curr.letterSpacing !== undefined &&
      base.letterSpacing !== curr.letterSpacing
    ) {
      nonBreaking.push(
        makeChange(
          'non-breaking',
          'scale',
          `typography.${ctx}.letterSpacing`,
          `Letter spacing in "${ctx}" changed from ${base.letterSpacing} to ${curr.letterSpacing}`,
          base.letterSpacing,
          curr.letterSpacing,
        ),
      );
    }

    // Line height changes
    const baseLineHeight = String(base.lineHeight);
    const currLineHeight = String(curr.lineHeight);
    if (baseLineHeight !== currLineHeight) {
      nonBreaking.push(
        makeChange(
          'non-breaking',
          'scale',
          `typography.${ctx}.lineHeight`,
          `Line height in "${ctx}" changed from ${baseLineHeight} to ${currLineHeight}`,
          baseLineHeight,
          currLineHeight,
        ),
      );
    }
  }

  // ── Heading size order ──
  const headingKeys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  for (let i = 0; i < headingKeys.length - 1; i++) {
    const bigger = headingKeys[i]!;
    const smaller = headingKeys[i + 1]!;
    const biggerPx = parsePx(current.hierarchy.headings[bigger].fontSize);
    const smallerPx = parsePx(current.hierarchy.headings[smaller].fontSize);
    if (!Number.isNaN(biggerPx) && !Number.isNaN(smallerPx) && smallerPx > biggerPx) {
      // Only flag if this wasn't already broken in baseline
      const baselineBiggerPx = parsePx(baseline.hierarchy.headings[bigger].fontSize);
      const baselineSmallerPx = parsePx(baseline.hierarchy.headings[smaller].fontSize);
      const wasAlreadyBroken =
        !Number.isNaN(baselineBiggerPx) &&
        !Number.isNaN(baselineSmallerPx) &&
        baselineSmallerPx > baselineBiggerPx;

      if (!wasAlreadyBroken) {
        breaking.push(
          makeChange(
            'breaking',
            'scale',
            `hierarchy.headings.${smaller}.fontSize`,
            `Heading size order violated: ${smaller} (${current.hierarchy.headings[smaller].fontSize}) is now larger than ${bigger} (${current.hierarchy.headings[bigger].fontSize})`,
            current.hierarchy.headings[bigger].fontSize,
            current.hierarchy.headings[smaller].fontSize,
          ),
        );
      }
    }
  }

  // ── Scale type changed ──
  if (baseline.hierarchy.scale !== current.hierarchy.scale) {
    breaking.push(
      makeChange(
        'breaking',
        'scale',
        'hierarchy.scale',
        `Scale type changed from "${baseline.hierarchy.scale}" to "${current.hierarchy.scale}"`,
        baseline.hierarchy.scale,
        current.hierarchy.scale,
      ),
    );
  }

  // ── Themes ──
  const baselineThemeNames = new Set(baseline.themes.map((t) => t.name));
  const currentThemeNames = new Set(current.themes.map((t) => t.name));

  for (const name of baselineThemeNames) {
    if (!currentThemeNames.has(name)) {
      breaking.push(
        makeChange(
          'breaking',
          'theme',
          `themes.${name}`,
          `Theme "${name}" was removed`,
          name,
          undefined,
        ),
      );
    }
  }

  for (const name of currentThemeNames) {
    if (!baselineThemeNames.has(name)) {
      improvements.push(
        makeChange(
          'improvement',
          'theme',
          `themes.${name}`,
          `New theme "${name}" added`,
          undefined,
          name,
        ),
      );
    }
  }

  // ── Modes ──
  const baselineModeNames = new Set(Object.keys(baseline.modes ?? {}));
  const currentModeNames = new Set(Object.keys(current.modes ?? {}));

  for (const name of baselineModeNames) {
    if (!currentModeNames.has(name)) {
      breaking.push(
        makeChange(
          'breaking',
          'mode',
          `modes.${name}`,
          `Mode "${name}" was removed`,
          name,
          undefined,
        ),
      );
    }
  }

  for (const name of currentModeNames) {
    if (!baselineModeNames.has(name)) {
      improvements.push(
        makeChange(
          'improvement',
          'mode',
          `modes.${name}`,
          `New mode "${name}" added`,
          undefined,
          name,
        ),
      );
    }
  }

  // ── Colors (hex comparison) ──
  const colorModes = ['light', 'dark'] as const;
  const colorGroups = ['text', 'background', 'border', 'interactive'] as const;

  for (const mode of colorModes) {
    for (const group of colorGroups) {
      const baseGroup = baseline.color[mode][group] as Record<string, { value: string }>;
      const currGroup = current.color[mode][group] as Record<string, { value: string }>;

      for (const key of Object.keys(baseGroup)) {
        const baseVal = baseGroup[key]?.value;
        const currVal = currGroup[key]?.value;
        if (baseVal !== undefined && currVal !== undefined && baseVal !== currVal) {
          nonBreaking.push(
            makeChange(
              'non-breaking',
              'color',
              `color.${mode}.${group}.${key}.value`,
              `Color token color.${mode}.${group}.${key} changed from ${baseVal} to ${currVal}`,
              baseVal,
              currVal,
            ),
          );
        }
      }
    }
  }

  // ── Spacing changes ──
  const baseSpacingKeys = Object.keys(baseline.spacing.scale);
  const currSpacingKeys = Object.keys(current.spacing.scale);

  // Find changed spacing values
  for (const key of baseSpacingKeys) {
    if (currSpacingKeys.includes(key)) {
      const baseVal = baseline.spacing.scale[key];
      const currVal = current.spacing.scale[key];
      if (baseVal !== currVal) {
        nonBreaking.push(
          makeChange(
            'non-breaking',
            'spacing',
            `spacing.scale.${key}`,
            `Spacing scale "${key}" changed from ${baseVal} to ${currVal}`,
            baseVal,
            currVal,
          ),
        );
      }
    }
  }

  // ── Dark mode completeness improvement ──
  // If baseline was missing dark mode tokens (text colors match light) but current has distinct ones
  const baselineDarkSameAsLight =
    baseline.color.dark.text.primary.value === baseline.color.light.text.primary.value;
  const currentDarkDifferent =
    current.color.dark.text.primary.value !== current.color.light.text.primary.value;

  if (baselineDarkSameAsLight && currentDarkDifferent) {
    improvements.push(
      makeChange(
        'improvement',
        'color',
        'color.dark',
        'Dark mode color tokens now differ from light mode (dark mode completeness improved)',
        baseline.color.dark.text.primary.value,
        current.color.dark.text.primary.value,
      ),
    );
  }

  const totalCount = breaking.length + nonBreaking.length + improvements.length;
  const summary =
    totalCount === 0
      ? 'No changes detected.'
      : `${breaking.length} breaking, ${nonBreaking.length} non-breaking, ${improvements.length} improvement${improvements.length !== 1 ? 's' : ''}`;

  return { breaking, nonBreaking, improvements, summary };
}
