#!/usr/bin/env node

/**
 * Registry build pipeline.
 *
 * Ingests from google-font-metadata, normalizes to FontEntry schema,
 * merges system font entries, and writes packages/fonts/data/registry.json.
 *
 * Usage: npx tsx scripts/build-registry.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// google-font-metadata is CJS — use createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { APIv2, APIVariable, APILicense } = require('google-font-metadata');

import type { FontEntry, FontRegistry } from '@fetchtype/types';

import { SYSTEM_FONT_ENTRIES } from './system-fonts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(family: string): string {
  return family.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type GFCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';

function normalizeCategory(cat: string): GFCategory {
  const map: Record<string, GFCategory> = {
    'sans-serif': 'sans-serif',
    'serif': 'serif',
    'monospace': 'monospace',
    'display': 'display',
    'handwriting': 'handwriting',
  };
  return map[cat] ?? 'sans-serif';
}

function normalizeLicenseType(raw: string): string {
  if (raw.includes('Open Font License')) return 'OFL-1.1';
  if (raw.includes('Apache')) return 'Apache-2.0';
  if (raw.includes('Ubuntu')) return 'UFL-1.0';
  if (raw.includes('MIT')) return 'MIT';
  return raw;
}

/** Map category to CSS generic family for fallback resolution */
function categoryToGeneric(cat: GFCategory): 'sans-serif' | 'serif' | 'monospace' {
  if (cat === 'monospace') return 'monospace';
  if (cat === 'serif') return 'serif';
  return 'sans-serif';
}

// ---------------------------------------------------------------------------
// Context scoring heuristics (Sprint 1 — basic; refined in Sprint 2 with metrics)
// ---------------------------------------------------------------------------

type TypographicCtx = 'display' | 'interface' | 'reading' | 'mono' | 'editorial' | 'data';

function scoreContexts(entry: {
  category: GFCategory;
  variable: boolean;
  weights: number[];
  hasItalic: boolean;
  hasOpticalSizing: boolean;
}): TypographicCtx[] {
  const contexts: TypographicCtx[] = [];

  if (entry.category === 'monospace') {
    contexts.push('mono', 'data');
    return contexts;
  }

  const weightRange = entry.weights.length > 0
    ? entry.weights[entry.weights.length - 1] - entry.weights[0]
    : 0;
  const hasMediumWeights = entry.weights.some(w => w >= 500 && w <= 600);
  const hasBoldRange = entry.weights.some(w => w >= 700);
  const hasLightWeights = entry.weights.some(w => w <= 300);

  // Display: display/handwriting categories, or fonts with wide weight range
  if (entry.category === 'display' || entry.category === 'handwriting') {
    contexts.push('display');
    if (entry.hasItalic && entry.weights.length >= 4) {
      contexts.push('editorial');
    }
    return contexts;
  }

  // Interface: needs medium weights, good weight range
  if (hasMediumWeights && entry.weights.length >= 4) {
    contexts.push('interface');
  }

  // Reading: serif or sans with italic and decent weight range
  if ((entry.category === 'serif' || entry.category === 'sans-serif') &&
      entry.weights.includes(400) &&
      entry.weights.length >= 3) {
    contexts.push('reading');
  }

  // Display: wide weight range, variable, or optical sizing
  if (weightRange >= 600 || entry.hasOpticalSizing || (entry.variable && hasLightWeights && hasBoldRange)) {
    contexts.push('display');
  }

  // Editorial: serif with italic and stylistic range
  if (entry.category === 'serif' && entry.hasItalic && entry.weights.length >= 4) {
    contexts.push('editorial');
  }

  // If nothing matched, give it a reading context as default
  if (contexts.length === 0) {
    contexts.push('reading');
  }

  return [...new Set(contexts)];
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

interface GFMv2Entry {
  family: string;
  id: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  unicodeRange: Record<string, string>;
  variants: Record<string, Record<string, Record<string, { url: Record<string, string> }>>>;
  category?: string;
}

interface GFMVariableEntry {
  family: string;
  id: string;
  axes: Record<string, { default: string; min: string; max: string; step: string }>;
  variants: Record<string, Record<string, Record<string, string>>>;
}

interface GFMLicenseEntry {
  id: string;
  authors: { copyright: string; website: string };
  license: { type: string; url: string };
}

function buildFontEntry(
  v2: GFMv2Entry,
  variableData: GFMVariableEntry | undefined,
  licenseData: GFMLicenseEntry | undefined,
): FontEntry {
  const id = slugify(v2.family);
  const category = normalizeCategory((v2 as any).category ?? guessCategory(v2));
  const isVariable = !!variableData;
  const hasItalic = v2.styles.includes('italic');
  const hasOpticalSizing = variableData?.axes?.opsz !== undefined;

  const axes = variableData
    ? Object.entries(variableData.axes).map(([tag, axis]) => ({
        tag,
        name: axisTagToName(tag),
        min: Number(axis.min),
        max: Number(axis.max),
        default: Number(axis.default),
        step: Number(axis.step) || 1,
        cssProperty: axisTagToCssProperty(tag),
      }))
    : [];

  // Estimate WOFF2 size from variant URLs (rough — actual size computed in enrichment)
  const estimatedPayload = estimatePayloadSize(v2);

  const contexts = scoreContexts({
    category,
    variable: isVariable,
    weights: v2.weights,
    hasItalic,
    hasOpticalSizing,
  });

  const licenseType = licenseData
    ? normalizeLicenseType(licenseData.license.type)
    : 'OFL-1.1';
  const licenseUrl = licenseData?.license.url ?? 'https://openfontlicense.org';

  // Determine available formats from variant data
  const formats = detectFormats(v2);

  // Google CDN URL
  const familyParam = v2.family.replace(/ /g, '+');
  const weightParam = isVariable
    ? `wght@${v2.weights[0]}..${v2.weights[v2.weights.length - 1]}`
    : `wght@${v2.weights.join(';')}`;
  const googleCdn = `https://fonts.googleapis.com/css2?family=${familyParam}:${weightParam}&display=swap`;

  // Fontsource package name
  const fontsourceBase = `@fontsource${isVariable ? '-variable' : ''}/${id}`;

  return {
    id,
    family: v2.family,
    version: 'v1', // google-font-metadata doesn't expose version consistently
    source: 'google',
    lastUpdated: new Date().toISOString().split('T')[0],

    category,
    tags: inferTags(v2.family, category),
    contexts,

    variable: isVariable,
    axes,
    weights: [...v2.weights].sort((a, b) => a - b),
    styles: v2.styles.includes('italic')
      ? ['normal' as const, 'italic' as const]
      : ['normal' as const],
    subsets: v2.subsets,
    formats,
    hasItalic,
    hasOpticalSizing,

    performance: {
      woff2Size: { latin: estimatedPayload },
      variableFileSize: isVariable ? estimatedPayload * 4 : null,
      estimatedPayload,
      loadingImpact: estimatedPayload < 50000 ? 'minimal' : estimatedPayload < 150000 ? 'moderate' : 'heavy',
    },

    // Placeholder metrics — enrichment pipeline fills these from actual font tables
    metrics: {
      unitsPerEm: 1000,
      ascent: 800,
      descent: -200,
      lineGap: 0,
      xHeight: null,
      capHeight: null,
      useTypoMetrics: true,
      hheaAscent: null,
      hheaDescent: null,
      winAscent: null,
      winDescent: null,
    },

    // Placeholder fallback — enrichment pipeline computes platform-aware overrides
    fallback: {
      targets: [],
      requiresPlatformSplit: false,
      generatedCSS: '',
    },

    // Placeholder pairing — pairing intelligence builds this
    pairing: {
      recommended: [],
    },

    license: {
      type: licenseType,
      url: licenseUrl,
      commercial: true,
      selfHostable: true,
      attribution: licenseData?.authors?.copyright ?? null,
    },

    install: {
      fontsource: fontsourceBase,
      googleCdn,
      npmPackage: fontsourceBase,
      system: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers for font entry construction
// ---------------------------------------------------------------------------

function guessCategory(v2: GFMv2Entry): string {
  // google-font-metadata v6 may not have category in APIv2; fall back to name heuristics
  const lower = v2.family.toLowerCase();
  if (lower.includes('mono') || lower.includes('code')) return 'monospace';
  if (lower.includes('serif') && !lower.includes('sans')) return 'serif';
  return 'sans-serif';
}

function axisTagToName(tag: string): string {
  const names: Record<string, string> = {
    wght: 'Weight', wdth: 'Width', slnt: 'Slant', ital: 'Italic',
    opsz: 'Optical Size', GRAD: 'Grade', CASL: 'Casual', CRSV: 'Cursive',
    MONO: 'Monospace', FILL: 'Fill', XTRA: 'x transparent', YTAS: 'y transparent ascender',
  };
  return names[tag] ?? tag;
}

function axisTagToCssProperty(tag: string): string | null {
  const map: Record<string, string> = {
    wght: 'font-weight', wdth: 'font-stretch', slnt: 'font-style',
    opsz: 'font-optical-sizing', ital: 'font-style',
  };
  return map[tag] ?? null;
}

function estimatePayloadSize(v2: GFMv2Entry): number {
  // Rough heuristic: sans-serif ~20-35KB, serif ~25-40KB, mono ~18-25KB, display varies
  const subsetCount = v2.subsets.length;
  const weightCount = v2.weights.length;
  const baseSize = 15000; // ~15KB base for latin
  return Math.round(baseSize + (weightCount * 1500) + (subsetCount * 500));
}

function detectFormats(v2: GFMv2Entry): ('woff2' | 'woff' | 'ttf' | 'otf')[] {
  const formats = new Set<'woff2' | 'woff' | 'ttf' | 'otf'>();
  // Check first variant for available formats
  const firstWeight = Object.keys(v2.variants)[0];
  if (firstWeight) {
    const firstStyle = Object.keys(v2.variants[firstWeight])[0];
    if (firstStyle) {
      const firstSubset = Object.keys(v2.variants[firstWeight][firstStyle])[0];
      if (firstSubset) {
        const urls = v2.variants[firstWeight][firstStyle][firstSubset]?.url;
        if (urls) {
          if (urls.woff2) formats.add('woff2');
          if (urls.woff) formats.add('woff');
          if (urls.truetype) formats.add('ttf');
        }
      }
    }
  }
  return formats.size > 0 ? [...formats] : ['woff2'];
}

/** Infer style tags from font family name and category */
function inferTags(family: string, category: GFCategory): string[] {
  const tags: string[] = [];
  const lower = family.toLowerCase();

  // Style classification heuristics
  if (category === 'sans-serif') {
    if (['inter', 'roboto', 'open sans', 'source sans', 'noto sans', 'dm sans', 'work sans'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('neo-grotesque');
    }
    if (['montserrat', 'poppins', 'raleway', 'questrial', 'josefin sans', 'comfortaa'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('geometric');
    }
    if (['lato', 'nunito', 'quicksand', 'cabin', 'karla', 'mulish'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('humanist');
    }
  }

  if (category === 'serif') {
    if (['playfair', 'bodoni', 'didot'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('didone');
    }
    if (['merriweather', 'noto serif', 'source serif', 'crimson', 'libre baskerville'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('transitional');
    }
    if (['eb garamond', 'cormorant', 'spectral'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('old-style');
    }
    if (['roboto slab', 'zilla slab', 'arvo'].some(f => lower.includes(f.toLowerCase()))) {
      tags.push('slab');
    }
  }

  if (category === 'monospace') {
    tags.push('code');
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function run() {
  console.log('Building fetchtype registry...');

  const v2Data = APIv2 as Record<string, GFMv2Entry>;
  const variableData = APIVariable as Record<string, GFMVariableEntry>;
  const licenseData = APILicense as Record<string, GFMLicenseEntry>;

  // We need category info — check if APIv2 has it or if we need APIDirect
  // google-font-metadata v6: APIv2 doesn't include category, need to check APIDirect
  let categoryMap: Record<string, string> = {};
  try {
    const { APIDirect } = require('google-font-metadata');
    if (APIDirect) {
      for (const [id, entry] of Object.entries(APIDirect as Record<string, any>)) {
        if (entry.category) {
          categoryMap[id] = entry.category;
        }
      }
      console.log(`  Loaded ${Object.keys(categoryMap).length} category mappings from APIDirect`);
    }
  } catch {
    console.log('  APIDirect not available, using heuristic categories');
  }

  const googleEntries: FontEntry[] = [];
  let skipped = 0;

  for (const [id, v2] of Object.entries(v2Data)) {
    try {
      // Inject category from APIDirect if available
      if (categoryMap[id]) {
        (v2 as any).category = categoryMap[id];
      }

      const entry = buildFontEntry(v2, variableData[id], licenseData[id]);
      googleEntries.push(entry);
    } catch (err) {
      skipped++;
      if (skipped <= 5) {
        console.warn(`  Skipped ${id}: ${(err as Error).message}`);
      }
    }
  }

  if (skipped > 5) {
    console.warn(`  ... and ${skipped - 5} more skipped`);
  }

  // Merge system fonts
  const allFonts = [...googleEntries, ...SYSTEM_FONT_ENTRIES];

  // Sort by family name for consistent output
  allFonts.sort((a, b) => a.family.localeCompare(b.family));

  const registry: FontRegistry = {
    version: '2.1.0',
    generatedAt: new Date().toISOString(),
    count: allFonts.length,
    fonts: allFonts,
  };

  // Write output
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(__dirname, '../packages/fonts/data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'registry.json');

  writeFileSync(outPath, JSON.stringify(registry, null, 0)); // Compact for npm payload
  const sizeMB = (Buffer.byteLength(JSON.stringify(registry)) / 1024 / 1024).toFixed(2);

  console.log(`\nRegistry built successfully:`);
  console.log(`  Google Fonts: ${googleEntries.length}`);
  console.log(`  System Fonts: ${SYSTEM_FONT_ENTRIES.length}`);
  console.log(`  Total:        ${allFonts.length}`);
  console.log(`  Variable:     ${allFonts.filter(f => f.variable).length}`);
  console.log(`  Size:         ${sizeMB} MB`);
  console.log(`  Output:       ${outPath}`);
}

run();
