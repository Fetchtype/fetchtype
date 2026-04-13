/**
 * Typography Score — A single 0-100 score with letter grade (A-F)
 * for any token set's typography quality.
 *
 * Gamified, shareable, and creates a "fix and improve" feedback loop.
 * Scored across 6 dimensions: readability, contrast, scale, consistency,
 * performance, and completeness.
 */

import type { DesignTokenSet, ValidationReport } from '@fetchtype/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoreDimension = {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1, sums to 1
  details: string[];
};

export type TypographyScore = {
  overall: number; // 0-100
  grade: string; // A+ / A / B / C / D / F
  dimensions: ScoreDimension[];
  topIssues: string[];
  improvements: string[];
  badge: string; // ASCII badge for sharing
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSize(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = value.match(/^([\d.]+)\s*(px|rem|em|ch)?$/);
  if (!match) return 0;
  const num = parseFloat(match[1]!);
  const unit = match[2];
  if (unit === 'rem' || unit === 'em') return num * 16;
  return num;
}

function hexToLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = hexToLuminance(fg);
  const l2 = hexToLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function gradeFromScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Scoring dimensions
// ---------------------------------------------------------------------------

function scoreReadability(tokens: DesignTokenSet): ScoreDimension {
  let score = 100;
  const details: string[] = [];

  // Body line-height
  const bodyLh = tokens.typography?.body?.lineHeight;
  if (typeof bodyLh === 'number') {
    if (bodyLh >= 1.5) {
      details.push(`Body line-height ${bodyLh} (good)`);
    } else if (bodyLh >= 1.3) {
      score -= 15;
      details.push(`Body line-height ${bodyLh} — increase to 1.5+ for comfortable reading`);
    } else {
      score -= 30;
      details.push(`Body line-height ${bodyLh} — too tight, aim for 1.5-1.7`);
    }
  }

  // Body font size
  const bodySize = parseSize(tokens.typography?.body?.fontSize ?? '16px');
  if (bodySize >= 16) {
    details.push(`Body size ${bodySize}px (good)`);
  } else if (bodySize >= 14) {
    score -= 10;
    details.push(`Body size ${bodySize}px — 16px is the modern minimum for comfortable reading`);
  } else {
    score -= 25;
    details.push(`Body size ${bodySize}px — too small, users will struggle`);
  }

  // Prose width
  const proseWidth = tokens.layout?.maxWidth?.prose;
  if (proseWidth) {
    const chMatch = String(proseWidth).match(/(\d+)ch/);
    if (chMatch) {
      const ch = parseInt(chMatch[1]!);
      if (ch >= 45 && ch <= 75) {
        details.push(`Prose width ${ch}ch (optimal)`);
      } else if (ch > 75) {
        score -= 10;
        details.push(`Prose width ${ch}ch — over 75ch strains the eye`);
      } else {
        score -= 10;
        details.push(`Prose width ${ch}ch — under 45ch feels cramped`);
      }
    }
  }

  // Heading line-height should be tighter than body
  const headingLh = tokens.typography?.heading?.lineHeight;
  if (typeof headingLh === 'number' && typeof bodyLh === 'number') {
    if (headingLh < bodyLh) {
      details.push('Heading line-height tighter than body (correct)');
    } else {
      score -= 10;
      details.push('Heading line-height should be tighter than body for visual hierarchy');
    }
  }

  return { name: 'Readability', score: Math.max(0, score), weight: 0.25, details };
}

function scoreContrast(tokens: DesignTokenSet): ScoreDimension {
  let score = 100;
  const details: string[] = [];

  const light = tokens.color?.light;
  if (light?.text?.primary?.value && light?.background?.primary?.value) {
    const ratio = contrastRatio(light.text.primary.value, light.background.primary.value);
    if (ratio >= 7) {
      details.push(`Primary text contrast ${ratio.toFixed(1)}:1 (AAA)`);
    } else if (ratio >= 4.5) {
      score -= 10;
      details.push(`Primary text contrast ${ratio.toFixed(1)}:1 (AA — good, but AAA is better)`);
    } else {
      score -= 40;
      details.push(`Primary text contrast ${ratio.toFixed(1)}:1 — fails WCAG AA (need 4.5:1)`);
    }
  } else {
    score -= 20;
    details.push('No light mode colors defined');
  }

  // Check dark mode exists
  const dark = tokens.color?.dark;
  if (dark?.text?.primary?.value && dark?.background?.primary?.value) {
    const ratio = contrastRatio(dark.text.primary.value, dark.background.primary.value);
    if (ratio >= 4.5) {
      details.push(`Dark mode contrast ${ratio.toFixed(1)}:1 (passing)`);
    } else {
      score -= 30;
      details.push(`Dark mode contrast ${ratio.toFixed(1)}:1 — fails WCAG AA`);
    }
  } else if (!dark) {
    score -= 15;
    details.push('No dark mode defined — limits accessibility');
  }

  // Check interactive states have sufficient contrast
  if (light?.interactive?.default?.value && light?.background?.primary?.value) {
    const ratio = contrastRatio(light.interactive.default.value, light.background.primary.value);
    if (ratio >= 3) {
      details.push(`Interactive element contrast ${ratio.toFixed(1)}:1 (passing)`);
    } else {
      score -= 15;
      details.push(`Interactive element contrast ${ratio.toFixed(1)}:1 — needs 3:1 minimum`);
    }
  }

  return { name: 'Contrast', score: Math.max(0, score), weight: 0.2, details };
}

function scoreScale(tokens: DesignTokenSet): ScoreDimension {
  let score = 100;
  const details: string[] = [];

  // Check heading hierarchy exists and is ordered
  const headings = tokens.hierarchy?.headings;
  if (headings) {
    const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    const sizes = levels
      .map(h => {
        const entry = headings[h];
        return entry ? parseSize(entry.fontSize) : 0;
      })
      .filter(s => s > 0);

    if (sizes.length >= 4) {
      details.push(`${sizes.length} heading levels defined`);
      // Check monotonic decrease
      let ordered = true;
      for (let i = 1; i < sizes.length; i++) {
        if (sizes[i]! >= sizes[i - 1]!) ordered = false;
      }
      if (ordered) {
        details.push('Heading scale is properly ordered (h1 > h2 > ...)');
      } else {
        score -= 15;
        details.push('Heading scale is not properly ordered');
      }
    } else if (sizes.length > 0) {
      score -= 10;
      details.push(`Only ${sizes.length} heading levels — add at least 4 for flexible hierarchy`);
    }
  } else {
    score -= 20;
    details.push('No heading hierarchy defined');
  }

  // Spacing scale
  const spacing = tokens.spacing?.scale;
  if (spacing) {
    const values = Object.values(spacing).map(v => parseSize(String(v)));
    if (values.length >= 5) {
      details.push(`${values.length}-step spacing scale`);
    } else {
      score -= 10;
      details.push(`Only ${values.length} spacing steps — 5+ recommended for flexible layouts`);
    }
  } else {
    score -= 15;
    details.push('No spacing scale defined');
  }

  // Type scale ratio
  const scaleRatio = tokens.hierarchy?.scale;
  if (scaleRatio) {
    details.push(`Type scale: ${scaleRatio}`);
  }

  return { name: 'Scale & Hierarchy', score: Math.max(0, score), weight: 0.2, details };
}

function scoreConsistency(tokens: DesignTokenSet): ScoreDimension {
  let score = 100;
  const details: string[] = [];

  // Check font family consistency
  const families = new Set<string>();
  const typography = tokens.typography;
  if (typography) {
    for (const [, context] of Object.entries(typography)) {
      if (context && typeof context === 'object' && 'fontFamily' in context) {
        const family = Array.isArray(context.fontFamily) ? context.fontFamily[0] : context.fontFamily;
        if (family) families.add(family as string);
      }
    }

    if (families.size <= 3) {
      details.push(`${families.size} font ${families.size === 1 ? 'family' : 'families'} — clean and focused`);
    } else {
      score -= 10 * (families.size - 3);
      details.push(`${families.size} font families — too many. Aim for 2-3 maximum`);
    }
  }

  // Check that all typography contexts have fallback stacks
  if (typography) {
    let hasFallbacks = 0;
    let total = 0;
    for (const [, context] of Object.entries(typography)) {
      if (context && typeof context === 'object' && 'fontFamily' in context) {
        total++;
        const family = context.fontFamily;
        if (Array.isArray(family) && family.length >= 2) hasFallbacks++;
      }
    }
    if (total > 0) {
      if (hasFallbacks === total) {
        details.push('All font stacks include fallbacks');
      } else {
        score -= 10;
        details.push(`${total - hasFallbacks}/${total} contexts missing font fallbacks`);
      }
    }
  }

  // Modes defined
  if (tokens.modes && Object.keys(tokens.modes).length > 0) {
    details.push(`${Object.keys(tokens.modes).length} typography modes defined`);
  }

  // Themes defined
  if (tokens.themes && Object.keys(tokens.themes).length > 0) {
    details.push(`${Object.keys(tokens.themes).length} theme variations defined`);
  }

  return { name: 'Consistency', score: Math.max(0, score), weight: 0.15, details };
}

function scorePerformance(tokens: DesignTokenSet): ScoreDimension {
  let score = 100;
  const details: string[] = [];

  // Count web fonts (non-system fonts)
  const webFonts = new Set<string>();
  const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'];

  const typography = tokens.typography;
  if (typography) {
    for (const [, context] of Object.entries(typography)) {
      if (context && typeof context === 'object' && 'fontFamily' in context) {
        const family = Array.isArray(context.fontFamily) ? context.fontFamily[0] : context.fontFamily;
        if (family && !systemFonts.some(sf => (family as string).toLowerCase().includes(sf.toLowerCase()))) {
          webFonts.add(family as string);
        }
      }
    }
  }

  if (webFonts.size === 0) {
    details.push('System fonts only — zero font payload (excellent)');
  } else if (webFonts.size <= 2) {
    details.push(`${webFonts.size} web font${webFonts.size === 1 ? '' : 's'} — good balance of style and speed`);
  } else if (webFonts.size <= 3) {
    score -= 10;
    details.push(`${webFonts.size} web fonts — consider reducing to 2 for faster loads`);
  } else {
    score -= 25;
    details.push(`${webFonts.size} web fonts — too many, significant load time impact`);
  }

  // Font-display strategy
  if (tokens.fontDisplay) {
    if (tokens.fontDisplay === 'swap' || tokens.fontDisplay === 'optional') {
      details.push(`font-display: ${tokens.fontDisplay} (good)`);
    } else if (tokens.fontDisplay === 'auto') {
      score -= 10;
      details.push('font-display: auto — set to "swap" or "optional" to prevent invisible text');
    }
  }

  return { name: 'Performance', score: Math.max(0, score), weight: 0.1, details };
}

function scoreCompleteness(tokens: DesignTokenSet): ScoreDimension {
  let score = 0;
  const details: string[] = [];

  // Essential contexts
  const essentials = ['heading', 'body', 'button', 'caption', 'label'] as const;
  let present = 0;
  for (const ctx of essentials) {
    if (tokens.typography?.[ctx]) present++;
  }
  const essentialScore = (present / essentials.length) * 40;
  score += essentialScore;
  if (present === essentials.length) {
    details.push('All essential typography contexts defined');
  } else {
    details.push(`${present}/${essentials.length} essential contexts (missing: ${essentials.filter(e => !tokens.typography?.[e]).join(', ')})`);
  }

  // Extended contexts
  const extended = ['input', 'code', 'blockquote', 'subheading'] as const;
  let extPresent = 0;
  for (const ctx of extended) {
    if (tokens.typography?.[ctx]) extPresent++;
  }
  score += (extPresent / extended.length) * 20;
  if (extPresent > 0) {
    details.push(`${extPresent}/${extended.length} extended contexts (${extended.filter(e => tokens.typography?.[e]).join(', ')})`);
  }

  // Colors
  if (tokens.color?.light && tokens.color?.dark) {
    score += 20;
    details.push('Light + dark mode colors defined');
  } else if (tokens.color?.light) {
    score += 10;
    details.push('Light mode colors defined (add dark mode for full coverage)');
  }

  // Layout
  if (tokens.layout?.maxWidth && tokens.layout?.breakpoints) {
    score += 10;
    details.push('Layout constraints and breakpoints defined');
  } else if (tokens.layout?.maxWidth) {
    score += 5;
    details.push('Layout widths defined (add breakpoints for responsive design)');
  }

  // Hierarchy
  if (tokens.hierarchy?.headings) {
    score += 10;
    details.push('Heading hierarchy defined');
  }

  return { name: 'Completeness', score: Math.min(100, score), weight: 0.1, details };
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function computeTypographyScore(
  tokens: DesignTokenSet,
  report?: ValidationReport,
): TypographyScore {
  const dimensions = [
    scoreReadability(tokens),
    scoreContrast(tokens),
    scoreScale(tokens),
    scoreConsistency(tokens),
    scorePerformance(tokens),
    scoreCompleteness(tokens),
  ];

  // Apply validation report penalties
  if (report) {
    const errorPenalty = report.counts.error * 5;
    const warningPenalty = report.counts.warning * 2;
    const totalPenalty = Math.min(30, errorPenalty + warningPenalty);
    if (totalPenalty > 0) {
      // Distribute penalty across dimensions
      for (const dim of dimensions) {
        dim.score = Math.max(0, dim.score - totalPenalty * dim.weight);
      }
    }
  }

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  const grade = gradeFromScore(overall);

  // Top issues from lowest-scoring dimensions
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const topIssues = sorted
    .filter(d => d.score < 80)
    .flatMap(d => d.details.filter(detail => !detail.includes('(good)') && !detail.includes('(correct)') && !detail.includes('(passing)') && !detail.includes('(optimal)') && !detail.includes('(excellent)') && !detail.includes('(AAA)')))
    .slice(0, 5);

  // Improvements — actionable suggestions
  const improvements: string[] = [];
  for (const dim of sorted) {
    if (dim.score < 70 && dim.name === 'Readability') {
      improvements.push('Increase body line-height to 1.5-1.7 and body font size to 16px+');
    }
    if (dim.score < 70 && dim.name === 'Contrast') {
      improvements.push('Fix text/background contrast to meet WCAG AA (4.5:1 for text, 3:1 for UI)');
    }
    if (dim.score < 70 && dim.name === 'Scale & Hierarchy') {
      improvements.push('Add a full h1-h6 heading hierarchy with a consistent type scale ratio');
    }
    if (dim.score < 80 && dim.name === 'Completeness') {
      improvements.push('Add missing typography contexts: caption, label, code, input');
    }
    if (dim.score < 80 && dim.name === 'Performance') {
      improvements.push('Reduce web fonts to 2-3 and set font-display: swap');
    }
  }

  const badge = generateBadge(overall, grade);

  return { overall, grade, dimensions, topIssues, improvements, badge };
}

function generateBadge(score: number, grade: string): string {
  const bar = '█'.repeat(Math.floor(score / 5)) + '░'.repeat(20 - Math.floor(score / 5));
  return [
    '┌─────────────────────────────┐',
    `│  fetchtype typography score │`,
    `│                             │`,
    `│         ${grade.padEnd(2)}  ${String(score).padStart(3)}/100        │`,
    `│  ${bar}  │`,
    '│                             │',
    `│  fetchtype.com/score        │`,
    '└─────────────────────────────┘',
  ].join('\n');
}
