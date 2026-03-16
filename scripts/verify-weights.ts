#!/usr/bin/env npx tsx
/**
 * Verify and fill missing weights/styles data in registry.json.
 *
 * For fonts missing weights data, infers from variable axes (wght min/max).
 * For monospace fonts, ensures weights array is populated.
 * Reports coverage stats before and after.
 *
 * Usage: npx tsx scripts/verify-weights.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'data', 'registry.json');

// Standard weight steps used by Google Fonts
const STANDARD_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

interface VariableAxis {
  tag: string;
  min: number;
  max: number;
  default: number;
  step: number;
  name: string;
  cssProperty: string | null;
}

interface FontEntry {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  axes: VariableAxis[];
  weights: number[];
  styles: string[];
  hasItalic: boolean;
  [key: string]: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

function inferWeightsFromAxes(font: FontEntry): number[] | null {
  const wghtAxis = font.axes.find((a) => a.tag === 'wght');
  if (!wghtAxis) return null;
  // Return standard weights within the axis min/max range
  return STANDARD_WEIGHTS.filter((w) => w >= wghtAxis.min && w <= wghtAxis.max);
}

const raw = readFileSync(REGISTRY_PATH, 'utf-8');
const registry = JSON.parse(raw) as Registry;

// Count before
const beforeMissingWeights = registry.fonts.filter((f) => !f.weights || f.weights.length === 0).length;
const beforeSingleWeight = registry.fonts.filter((f) => f.weights && f.weights.length === 1).length;
const beforeMonoMissing = registry.fonts.filter(
  (f) => f.category === 'monospace' && (!f.weights || f.weights.length === 0),
).length;

let filledFromAxes = 0;
let filledMono = 0;
let alreadyComplete = 0;

for (const font of registry.fonts) {
  // If weights array is empty or missing, try to infer
  if (!font.weights || font.weights.length === 0) {
    const inferred = inferWeightsFromAxes(font);
    if (inferred && inferred.length > 0) {
      font.weights = inferred;
      filledFromAxes++;
    } else if (font.category === 'monospace') {
      // Monospace fonts typically have at least 400
      font.weights = [400];
      filledMono++;
    }
  } else if (font.variable && font.weights.length === 1) {
    // Variable font with only one weight — expand from axes
    const inferred = inferWeightsFromAxes(font);
    if (inferred && inferred.length > 1) {
      font.weights = inferred;
      filledFromAxes++;
    } else {
      alreadyComplete++;
    }
  } else {
    alreadyComplete++;
  }

  // Ensure styles is consistent with hasItalic
  if (font.hasItalic && !font.styles.includes('italic')) {
    font.styles = [...font.styles, 'italic'];
  }
}

// Count after
const afterMissingWeights = registry.fonts.filter((f) => !f.weights || f.weights.length === 0).length;
const afterSingleWeight = registry.fonts.filter((f) => f.weights && f.weights.length === 1).length;

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

console.log('=== verify-weights results ===');
console.log(`\nBefore:`);
console.log(`  Fonts missing weights:         ${beforeMissingWeights}`);
console.log(`  Fonts with only 1 weight:      ${beforeSingleWeight}`);
console.log(`  Monospace fonts missing weights: ${beforeMonoMissing}`);
console.log(`\nAfter:`);
console.log(`  Fonts missing weights:         ${afterMissingWeights}`);
console.log(`  Fonts with only 1 weight:      ${afterSingleWeight}`);
console.log(`\nActions taken:`);
console.log(`  Filled from variable axes:     ${filledFromAxes}`);
console.log(`  Filled monospace defaults:     ${filledMono}`);
console.log(`  Already complete:              ${alreadyComplete}`);
console.log(`\nTotal fonts in registry:         ${registry.count}`);
