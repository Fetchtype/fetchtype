import type { FontEntry } from '@fetchtype/types';

export type TypographicContext = 'display' | 'interface' | 'reading' | 'mono' | 'editorial' | 'data';

export type ContextScores = Record<TypographicContext, number>;

function cap(score: number): number {
  return Math.min(1.0, Math.max(0, Math.round(score * 1000) / 1000));
}

function hasAxis(font: FontEntry, tag: string): boolean {
  return font.axes.some((a) => a.tag === tag);
}

function computeDisplayScore(font: FontEntry): number {
  let score = 0;
  if (font.category === 'display' || font.category === 'handwriting') score += 0.3;
  else if (font.category === 'serif') score += 0.2;
  else if (font.category === 'sans-serif') score += 0.1;
  if (hasAxis(font, 'wght')) score += 0.2;
  if (hasAxis(font, 'opsz') || font.hasOpticalSizing) score += 0.15;
  if (font.weights.some((w) => w >= 700)) score += 0.1;
  if (font.tags.some((t) => ['geometric', 'elegant', 'decorative'].includes(t))) score += 0.05;
  return cap(score);
}

function computeInterfaceScore(font: FontEntry): number {
  let score = 0;
  if (font.category === 'sans-serif') score += 0.3;
  if (font.weights.length >= 5) score += 0.2;
  if (font.metrics.xHeight !== null && font.metrics.xHeight > 0) score += 0.15;
  if (font.variable) score += 0.1;
  if (font.performance.loadingImpact === 'minimal' || font.performance.loadingImpact === 'low' as string)
    score += 0.1;
  if (font.subsets.includes('latin-ext')) score += 0.1;
  if (font.tags.some((t) => ['clean', 'neutral', 'geometric'].includes(t))) score += 0.05;
  return cap(score);
}

function computeReadingScore(font: FontEntry): number {
  let score = 0;
  if (font.category === 'serif') score += 0.25;
  else if (font.category === 'sans-serif') score += 0.15;
  if (font.hasItalic) score += 0.2;
  if (font.weights.length >= 3) score += 0.15;
  if (hasAxis(font, 'opsz') || font.hasOpticalSizing) score += 0.1;
  if (font.subsets.length > 3) score += 0.1;
  if (font.tags.some((t) => ['humanist', 'classic', 'readable'].includes(t))) score += 0.05;
  return cap(score);
}

function computeMonoScore(font: FontEntry): number {
  if (font.category !== 'monospace') return 0;
  let score = 0.6;
  if (font.tags.some((t) => t === 'ligatures')) score += 0.15;
  if (font.weights.length >= 3) score += 0.1;
  if (font.variable) score += 0.1;
  if (font.tags.some((t) => t === 'coding')) score += 0.05;
  return cap(score);
}

function computeEditorialScore(font: FontEntry): number {
  let score = 0;
  if (font.category === 'serif' || font.category === 'display') score += 0.25;
  if (font.hasItalic) score += 0.2;
  if (hasAxis(font, 'opsz') || font.hasOpticalSizing) score += 0.15;
  if (hasAxis(font, 'wght')) score += 0.15;
  if (font.weights.length >= 5) score += 0.1;
  if (font.tags.some((t) => ['elegant', 'literary', 'classic'].includes(t))) score += 0.1;
  if (font.subsets.length > 1) score += 0.05;
  return cap(score);
}

function computeDataScore(font: FontEntry): number {
  let score = 0;
  if (font.category === 'monospace') score += 0.3;
  else if (font.category === 'sans-serif') score += 0.25;
  if (font.performance.loadingImpact === 'minimal') score += 0.15;
  if (font.variable) score += 0.1;
  if (hasAxis(font, 'wdth')) score += 0.1;
  if (font.tags.some((t) => ['tabular', 'technical'].includes(t))) score += 0.1;
  return cap(score);
}

export function computeContextScores(font: FontEntry): ContextScores {
  return {
    display: computeDisplayScore(font),
    interface: computeInterfaceScore(font),
    reading: computeReadingScore(font),
    mono: computeMonoScore(font),
    editorial: computeEditorialScore(font),
    data: computeDataScore(font),
  };
}
