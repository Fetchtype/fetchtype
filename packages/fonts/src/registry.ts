/**
 * Runtime registry module.
 *
 * Loads the bundled registry.json and provides query functions
 * for font lookup, search, and filtering.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FontEntry, FontRegistry, TypographicContext } from '@fetchtype/types';

// ---------------------------------------------------------------------------
// Registry loading
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '../data/registry.json');

let _registry: FontRegistry | null = null;

function getRegistry(): FontRegistry {
  if (!_registry) {
    const raw = readFileSync(REGISTRY_PATH, 'utf-8');
    _registry = JSON.parse(raw) as FontRegistry;
  }
  return _registry;
}

/** Get the full registry (for advanced use). */
export function loadRegistry(): FontRegistry {
  return getRegistry();
}

/** Get registry metadata without loading all fonts. */
export function registryStats(): { version: string; generatedAt: string; count: number; variableCount: number } {
  const reg = getRegistry();
  return {
    version: reg.version,
    generatedAt: reg.generatedAt,
    count: reg.count,
    variableCount: reg.fonts.filter(f => f.variable).length,
  };
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** Resolve a single font by ID (e.g. "inter") or family name (e.g. "Inter"). */
export function resolveFont(idOrFamily: string): FontEntry | undefined {
  const reg = getRegistry();
  const normalized = idOrFamily.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Try ID match first (fast)
  const byId = reg.fonts.find(f => f.id === normalized);
  if (byId) return byId;

  // Try case-insensitive family match
  const lowerFamily = idOrFamily.trim().toLowerCase();
  return reg.fonts.find(f => f.family.toLowerCase() === lowerFamily);
}

/** Check if a font exists in the registry. */
export function hasFont(idOrFamily: string): boolean {
  return resolveFont(idOrFamily) !== undefined;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type RegistrySearchOptions = {
  /** Free-text query matched against family, tags, and category */
  query?: string;
  /** Filter by typographic context */
  context?: TypographicContext;
  /** Only variable fonts */
  variable?: boolean;
  /** Filter by category */
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  /** Filter by subset support (e.g. 'cyrillic') */
  subset?: string;
  /** Maximum estimated payload in bytes */
  maxPayload?: number;
  /** Font source filter */
  source?: 'google' | 'fontsource' | 'system' | 'community';
  /** Maximum number of results (default: 20) */
  limit?: number;
};

/** Search the registry with free-text and filters. */
export function searchRegistry(options: RegistrySearchOptions = {}): FontEntry[] {
  const reg = getRegistry();
  const limit = options.limit ?? 20;

  let results = reg.fonts;

  // Apply filters
  if (options.source) {
    results = results.filter(f => f.source === options.source);
  }
  if (options.category) {
    results = results.filter(f => f.category === options.category);
  }
  if (options.variable !== undefined) {
    results = results.filter(f => f.variable === options.variable);
  }
  if (options.context) {
    results = results.filter(f => f.contexts.includes(options.context!));
  }
  if (options.subset) {
    const subset = options.subset.toLowerCase();
    results = results.filter(f => f.subsets.some(s => s.toLowerCase() === subset));
  }
  if (options.maxPayload !== undefined) {
    results = results.filter(f => f.performance.estimatedPayload <= options.maxPayload!);
  }

  // Free-text search with relevance scoring
  if (options.query) {
    const terms = options.query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = results
      .map(f => {
        const familyLower = f.family.toLowerCase();
        const searchable = [familyLower, f.category, ...f.tags, ...f.contexts, f.source].join(' ');
        if (!terms.every(term => searchable.includes(term))) return null;

        // Score: exact family match > starts-with > word boundary > substring
        let score = 0;
        for (const term of terms) {
          if (familyLower === term) score += 100;
          else if (familyLower.startsWith(term)) score += 50;
          else if (familyLower.includes(term)) score += 20;
          else if (f.tags.some(t => t.includes(term))) score += 10;
          else score += 1;
        }
        // Boost variable fonts and popular weight ranges
        if (f.variable) score += 3;
        if (f.weights.length >= 6) score += 2;
        return { font: f, score };
      })
      .filter((s): s is { font: FontEntry; score: number } => s !== null)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => s.font);
  }

  return results.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Suggest (registry-aware version of the suggest engine)
// ---------------------------------------------------------------------------

export type RegistrySuggestOptions = {
  context: TypographicContext;
  limit?: number;
  variable?: boolean;
  maxPayload?: number;
  subset?: string;
};

/** Suggest fonts for a typographic context, powered by the full registry. */
export function suggestFromRegistry(options: RegistrySuggestOptions): FontEntry[] {
  const reg = getRegistry();
  const limit = options.limit ?? 5;

  let candidates = reg.fonts.filter(f => {
    if (!f.contexts.includes(options.context)) return false;
    if (options.variable !== undefined && f.variable !== options.variable) return false;
    if (options.maxPayload !== undefined && f.performance.estimatedPayload > options.maxPayload) return false;
    if (options.subset) {
      const subset = options.subset.toLowerCase();
      if (!f.subsets.some(s => s.toLowerCase() === subset)) return false;
    }
    // Exclude system fonts from suggestions by default (they're zero-payload but not installable)
    if (f.source === 'system') return false;
    return true;
  });

  // Sort by relevance: variable first, more weights, smaller payload
  candidates.sort((a, b) => {
    if (a.variable !== b.variable) return a.variable ? -1 : 1;
    if (a.weights.length !== b.weights.length) return b.weights.length - a.weights.length;
    return a.performance.estimatedPayload - b.performance.estimatedPayload;
  });

  return candidates.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Pair (basic — enhanced in pairing intelligence module)
// ---------------------------------------------------------------------------

/** Get pairing recommendations for a font. */
export function getPairings(idOrFamily: string, role?: 'heading' | 'body' | 'accent' | 'mono'): FontEntry[] {
  const font = resolveFont(idOrFamily);
  if (!font) return [];

  const reg = getRegistry();
  const recs = font.pairing.recommended
    .filter(r => !role || r.role === role)
    .sort((a, b) => b.confidence - a.confidence);

  return recs
    .map(r => reg.fonts.find(f => f.id === r.fontId))
    .filter((f): f is FontEntry => f !== undefined);
}
