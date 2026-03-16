#!/usr/bin/env npx tsx
/**
 * Persist curated pairings from pairing.ts into registry.json.
 *
 * Reads the CURATED_PAIRINGS map, resolves family names to font IDs,
 * and writes the pairing.recommended array into each font entry.
 *
 * Usage: npx tsx scripts/enrich-pairings.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REGISTRY_PATH = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'data', 'registry.json');

interface FontEntry {
  id: string;
  family: string;
  category: string;
  pairing: { recommended: { fontId: string; role: string; confidence: number; rationale: string }[] };
  [key: string]: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

// Read pairing.ts source to extract CURATED_PAIRINGS (not exported)
const pairingModule = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'src', 'pairing.ts');
const pairingSource = readFileSync(pairingModule, 'utf-8');

const curatedMatch = pairingSource.match(/const CURATED_PAIRINGS[^=]*=\s*\{([\s\S]*?)^};/m);
if (!curatedMatch) {
  console.error('Could not find CURATED_PAIRINGS in pairing.ts');
  process.exit(1);
}

// Load registry
const registry: Registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
const familyToId = new Map<string, string>();
for (const font of registry.fonts) {
  familyToId.set(font.family.toLowerCase(), font.id);
}

// Parse curated pairings from source text
const entries: Map<string, { family: string; role: string; confidence: number; rationale: string }[]> = new Map();

const entryRegex = /'([^']+)':\s*\[([\s\S]*?)\],/g;
let entryMatch: RegExpExecArray | null;
const fullCurated = curatedMatch[0];

while ((entryMatch = entryRegex.exec(fullCurated)) !== null) {
  const fontId = entryMatch[1]!;
  const block = entryMatch[2]!;

  const pairings: { family: string; role: string; confidence: number; rationale: string }[] = [];
  const pairingRegex = /family:\s*'([^']+)',\s*role:\s*'([^']+)',\s*confidence:\s*([\d.]+),\s*rationale:\s*'([^']+)'/g;
  let pm: RegExpExecArray | null;
  while ((pm = pairingRegex.exec(block)) !== null) {
    pairings.push({
      family: pm[1]!,
      role: pm[2]!,
      confidence: parseFloat(pm[3]!),
      rationale: pm[4]!,
    });
  }
  if (pairings.length > 0) {
    entries.set(fontId, pairings);
  }
}

console.log(`Found ${entries.size} curated pairing entries in pairing.ts`);

// Resolve and persist into registry
let updated = 0;
let totalPairings = 0;
let unresolved = 0;

for (const [fontId, pairings] of entries) {
  const fontEntry = registry.fonts.find(f => f.id === fontId);
  if (!fontEntry) {
    console.warn(`  Warning: font ID "${fontId}" not found in registry`);
    continue;
  }

  const resolved: { fontId: string; role: string; confidence: number; rationale: string }[] = [];
  for (const p of pairings) {
    const targetId = familyToId.get(p.family.toLowerCase());
    if (!targetId) {
      console.warn(`  Warning: pairing family "${p.family}" for ${fontId} not found in registry`);
      unresolved++;
      continue;
    }
    resolved.push({ fontId: targetId, role: p.role, confidence: p.confidence, rationale: p.rationale });
  }

  if (resolved.length > 0) {
    fontEntry.pairing.recommended = resolved;
    updated++;
    totalPairings += resolved.length;
  }
}

// Write back
writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

console.log(`\nResults:`);
console.log(`  Fonts with persisted pairings: ${updated}`);
console.log(`  Total pairing recommendations: ${totalPairings}`);
console.log(`  Unresolved family references: ${unresolved}`);
console.log(`  Registry written to: ${REGISTRY_PATH}`);
