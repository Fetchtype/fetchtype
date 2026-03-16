export const prerender = false;

import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Registry cache — loaded once at cold start
// ---------------------------------------------------------------------------

interface PairingRecommendation {
  fontId: string;
  role: string;
  confidence: number;
  rationale: string;
  source: string;
}

interface FontEntry {
  id: string;
  family: string;
  version: string;
  source: string;
  lastUpdated: string;
  category: string;
  tags: string[];
  contexts: string[];
  variable: boolean;
  axes: unknown[];
  weights: number[];
  styles: string[];
  subsets: string[];
  formats: string[];
  hasItalic: boolean;
  hasOpticalSizing: boolean;
  performance: unknown;
  metrics: unknown;
  fallback: unknown;
  pairing: { recommended: PairingRecommendation[] };
  license: unknown;
  install: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

function loadRegistry(): Map<string, FontEntry> {
  const registryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../../../packages/fonts/data/registry.json'
  );
  const raw = readFileSync(registryPath, 'utf-8');
  const parsed = JSON.parse(raw) as Registry;
  const map = new Map<string, FontEntry>();
  for (const font of parsed.fonts) {
    map.set(font.id, font);
  }
  return map;
}

let _cache: Map<string, FontEntry> | null = null;

function getRegistry(): Map<string, FontEntry> {
  if (!_cache) {
    _cache = loadRegistry();
  }
  return _cache;
}

// ---------------------------------------------------------------------------
// GET /api/v2/fonts/compare?fonts=inter,roboto,open-sans
// Returns: comparison object with metrics, performance, pairings side by side
// ---------------------------------------------------------------------------

export const GET: APIRoute = ({ url }) => {
  const fontsParam = url.searchParams.get('fonts');
  if (!fontsParam) {
    return new Response(
      JSON.stringify({ error: 'Query param `fonts` is required (comma-separated font IDs)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  const fontIds = fontsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (fontIds.length < 1) {
    return new Response(
      JSON.stringify({ error: 'At least one font ID is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  const registry = getRegistry();

  const comparison = fontIds.map((rawId) => {
    const id = rawId.toLowerCase();
    const font = registry.get(id);
    if (!font) return { id: rawId, found: false };
    return {
      id: font.id,
      found: true,
      family: font.family,
      category: font.category,
      variable: font.variable,
      weights: font.weights,
      styles: font.styles,
      metrics: font.metrics,
      performance: font.performance,
      contexts: font.contexts,
      tags: font.tags,
      pairingCount: font.pairing?.recommended?.length ?? 0,
      pairings: font.pairing?.recommended ?? [],
    };
  });

  return new Response(JSON.stringify({ fonts: comparison }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
};
