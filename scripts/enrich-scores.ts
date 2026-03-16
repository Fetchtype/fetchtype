#!/usr/bin/env npx tsx
/**
 * Persist context scores into registry.json.
 *
 * Reads registry.json, computes display/interface/reading/mono/editorial/data
 * fitness scores for every font entry, and writes them back to the file.
 *
 * Usage: npx tsx scripts/enrich-scores.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'data', 'registry.json');

type TypographicContext = 'display' | 'interface' | 'reading' | 'mono' | 'editorial' | 'data';
type ContextScores = Record<TypographicContext, number>;

interface VariableAxis {
  tag: string;
  min: number;
  max: number;
  default: number;
  step: number;
  name: string;
  cssProperty: string | null;
}

interface FontPerformance {
  woff2Size: Record<string, number>;
  variableFileSize: number | null;
  estimatedPayload: number;
  loadingImpact: 'minimal' | 'moderate' | 'heavy';
}

interface FontMetrics {
  xHeight: number | null;
  [key: string]: unknown;
}

interface FontEntry {
  id: string;
  family: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  tags: string[];
  contexts: string[];
  variable: boolean;
  axes: VariableAxis[];
  weights: number[];
  styles: string[];
  subsets: string[];
  hasItalic: boolean;
  hasOpticalSizing: boolean;
  performance: FontPerformance;
  metrics: FontMetrics;
  contextScores?: ContextScores;
  [key: string]: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

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
  if (font.performance.loadingImpact === 'minimal') score += 0.1;
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

function computeContextScores(font: FontEntry): ContextScores {
  return {
    display: computeDisplayScore(font),
    interface: computeInterfaceScore(font),
    reading: computeReadingScore(font),
    mono: computeMonoScore(font),
    editorial: computeEditorialScore(font),
    data: computeDataScore(font),
  };
}

const raw = readFileSync(REGISTRY_PATH, 'utf-8');
const registry = JSON.parse(raw) as Registry;

let enriched = 0;
const scoreDistribution: Record<TypographicContext, { min: number; max: number; sum: number }> = {
  display: { min: 1, max: 0, sum: 0 },
  interface: { min: 1, max: 0, sum: 0 },
  reading: { min: 1, max: 0, sum: 0 },
  mono: { min: 1, max: 0, sum: 0 },
  editorial: { min: 1, max: 0, sum: 0 },
  data: { min: 1, max: 0, sum: 0 },
};

for (const font of registry.fonts) {
  const scores = computeContextScores(font);
  font.contextScores = scores;
  enriched++;
  for (const ctx of Object.keys(scores) as TypographicContext[]) {
    const v = scores[ctx];
    scoreDistribution[ctx].sum += v;
    if (v < scoreDistribution[ctx].min) scoreDistribution[ctx].min = v;
    if (v > scoreDistribution[ctx].max) scoreDistribution[ctx].max = v;
  }
}

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

console.log(`✓ Enriched ${enriched} fonts with context scores`);
console.log('\nScore distribution (min / avg / max):');
for (const ctx of Object.keys(scoreDistribution) as TypographicContext[]) {
  const d = scoreDistribution[ctx];
  const avg = (d.sum / enriched).toFixed(3);
  console.log(`  ${ctx.padEnd(12)} ${d.min.toFixed(3)} / ${avg} / ${d.max.toFixed(3)}`);
}
