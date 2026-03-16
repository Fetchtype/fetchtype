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
  // 4 levels up: v2/fonts/ → v2/ → api/ → pages/ → src/ → docs/ → apps/ → repo root
  // then into packages/fonts/data/registry.json
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
// POST /api/v2/fonts/batch
// Body: { fontIds: string[] }
// Returns: { fonts: FontEntry[], notFound: string[] }
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  const fontIds = (body as { fontIds?: unknown }).fontIds;
  if (!Array.isArray(fontIds)) {
    return new Response(
      JSON.stringify({ error: '`fontIds` must be an array of strings' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  const registry = getRegistry();
  const fonts: FontEntry[] = [];
  const notFound: string[] = [];

  for (const raw of fontIds.slice(0, 50)) {
    const id = String(raw).trim().toLowerCase();
    const font = registry.get(id);
    if (font) {
      fonts.push(font);
    } else {
      notFound.push(String(raw));
    }
  }

  return new Response(JSON.stringify({ fonts, notFound }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
};
