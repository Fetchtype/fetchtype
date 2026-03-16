#!/usr/bin/env npx tsx
/**
 * Enrich registry.json with algorithmic pairings for fonts that lack them.
 *
 * - Marks existing persisted pairings as source: 'curated'
 * - Computes algorithmic pairings for the remaining ~1,800 fonts
 * - Marks those as source: 'algorithmic'
 * - Never overwrites curated pairings
 * - Idempotent: safe to re-run
 *
 * Usage: npx tsx scripts/enrich-algorithmic-pairings.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'data', 'registry.json');

// ---------------------------------------------------------------------------
// Types (inline to avoid build dependency on @fetchtype/types)
// ---------------------------------------------------------------------------

interface PairingRecommendation {
  fontId: string;
  role: string;
  confidence: number;
  rationale: string;
  source?: 'curated' | 'algorithmic';
}

interface FontEntry {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  weights: number[];
  hasItalic: boolean;
  subsets: string[];
  source: string;
  pairing: { recommended: PairingRecommendation[] };
  [key: string]: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

// ---------------------------------------------------------------------------
// Algorithmic pairing logic (mirrors pairing.ts but operates on raw objects)
// ---------------------------------------------------------------------------

type PairingStrategy = {
  targetCategories: string[];
  rationale: string;
};

const CONTRAST_STRATEGIES: Record<string, Record<string, PairingStrategy>> = {
  'sans-serif': {
    heading: { targetCategories: ['serif', 'display'], rationale: 'Serif heading adds contrast over sans body' },
    body: { targetCategories: ['serif'], rationale: 'Serif for long-form reading alongside sans headlines' },
    accent: { targetCategories: ['display', 'handwriting'], rationale: 'Display/decorative font for accent elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'serif': {
    heading: { targetCategories: ['sans-serif'], rationale: 'Sans heading provides modern contrast' },
    body: { targetCategories: ['sans-serif'], rationale: 'Sans body for readability under serif headlines' },
    accent: { targetCategories: ['display'], rationale: 'Display font for accent elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'monospace': {
    heading: { targetCategories: ['sans-serif'], rationale: 'Sans heading for documentation structure' },
    body: { targetCategories: ['sans-serif'], rationale: 'Sans body for UI around code' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Sans accent for navigation elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Same category for consistent code styling' },
  },
  'display': {
    heading: { targetCategories: ['display', 'serif'], rationale: 'Display or serif for complementary headlines' },
    body: { targetCategories: ['sans-serif', 'serif'], rationale: 'Readable body font under display headlines' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Clean sans for supporting UI elements' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code and data elements' },
  },
  'handwriting': {
    heading: { targetCategories: ['serif', 'sans-serif'], rationale: 'Formal heading under decorative elements' },
    body: { targetCategories: ['sans-serif', 'serif'], rationale: 'Readable body font under decorative headers' },
    accent: { targetCategories: ['sans-serif'], rationale: 'Clean supporting font' },
    mono: { targetCategories: ['monospace'], rationale: 'Monospace for code elements' },
  },
};

/**
 * Generate algorithmic pairings for a font.
 * Accepts the full registry as a parameter to avoid reloading for every font.
 */
function computeAlgorithmicPairings(
  font: FontEntry,
  allFonts: FontEntry[],
  roles: ('heading' | 'body' | 'mono')[] = ['heading', 'body', 'mono'],
): PairingRecommendation[] {
  const strategies = CONTRAST_STRATEGIES[font.category] ?? CONTRAST_STRATEGIES['sans-serif']!;
  const recommendations: PairingRecommendation[] = [];

  for (const role of roles) {
    const strategy = strategies[role];
    if (!strategy) continue;

    const candidates = allFonts
      .filter(
        f =>
          f.id !== font.id &&
          f.source !== 'system' &&
          strategy.targetCategories.includes(f.category) &&
          f.weights.length >= 3,
      )
      .slice(0, 100);

    const scored = candidates.map(c => {
      let score = 0.5;
      if (c.variable) score += 0.1;
      if (c.weights.length >= 6) score += 0.05;
      if (c.hasItalic) score += 0.05;
      if (c.subsets.length >= 3) score += 0.05;
      const sharedSubsets = font.subsets.filter(s => c.subsets.includes(s));
      score += Math.min(sharedSubsets.length * 0.02, 0.1);
      return {
        fontId: c.id,
        role,
        confidence: Math.min(score, 0.95),
        rationale: strategy.rationale,
        source: 'algorithmic' as const,
      };
    });

    scored.sort((a, b) => b.confidence - a.confidence);
    recommendations.push(...scored.slice(0, 3));
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Main enrichment pass
// ---------------------------------------------------------------------------

const registry: Registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));

let markedCurated = 0;
let enriched = 0;
let alreadyHadAlgorithmic = 0;
let totalPairings = 0;

// Pass 1: mark all existing pairings without a source as 'curated'
for (const font of registry.fonts) {
  if (!font.pairing || !Array.isArray(font.pairing.recommended)) continue;

  let changed = false;
  for (const rec of font.pairing.recommended) {
    if (!rec.source) {
      rec.source = 'curated';
      changed = true;
    }
  }
  if (changed) markedCurated++;
}

// Pass 2: for each font without any pairings (or only algorithmic), compute algorithmic pairings
for (const font of registry.fonts) {
  if (!font.pairing || !Array.isArray(font.pairing.recommended)) {
    font.pairing = { recommended: [] };
  }

  const existing = font.pairing.recommended;

  // Check if there are already curated pairings
  const hasCurated = existing.some(r => r.source === 'curated' || !r.source);

  if (hasCurated) {
    // Already enriched with curated data; skip (never overwrite curated)
    totalPairings += existing.length;
    continue;
  }

  // Check if already has sufficient algorithmic pairings
  const existingAlgorithmic = existing.filter(r => r.source === 'algorithmic');
  if (existingAlgorithmic.length >= 3) {
    alreadyHadAlgorithmic++;
    totalPairings += existing.length;
    continue;
  }

  // Compute algorithmic pairings for all three roles
  const newPairings = computeAlgorithmicPairings(font, registry.fonts);

  if (newPairings.length > 0) {
    font.pairing.recommended = newPairings;
    enriched++;
    totalPairings += newPairings.length;
  }
}

// Write back
writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

const withPairings = registry.fonts.filter(
  f => f.pairing?.recommended && f.pairing.recommended.length > 0,
).length;
const coverage = ((withPairings / registry.fonts.length) * 100).toFixed(1);

console.log('\nAlgorithmic pairing enrichment complete:');
console.log(`  Fonts marked as curated:         ${markedCurated}`);
console.log(`  Fonts enriched algorithmically:  ${enriched}`);
console.log(`  Already had algorithmic pairings:${alreadyHadAlgorithmic}`);
console.log(`  Total pairing recommendations:   ${totalPairings}`);
console.log(`  Coverage: ${withPairings}/${registry.fonts.length} fonts (${coverage}%)`);
console.log(`  Registry written to: ${REGISTRY_PATH}`);
