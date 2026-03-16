#!/usr/bin/env npx tsx
/**
 * Compute and persist per-font size guidance into registry.json.
 *
 * Reads each font entry, runs computeSizeGuidance(), and writes the
 * result back into the sizeGuidance field of each entry.
 *
 * Usage: npx tsx scripts/enrich-sizes.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeSizeGuidance } from '../packages/fonts/src/size-guidance.js';
import type { FontEntry } from '../packages/types/src/registry.js';

const REGISTRY_PATH = resolve(import.meta.dirname!, '..', 'packages', 'fonts', 'data', 'registry.json');

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

const registry: Registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));

let updated = 0;

for (const font of registry.fonts) {
  const guidance = computeSizeGuidance(font);
  (font as FontEntry & { sizeGuidance: unknown }).sizeGuidance = guidance;
  updated++;
}

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');

console.log(`Size guidance computed for ${updated} fonts.`);
console.log(`Registry written to: ${REGISTRY_PATH}`);
