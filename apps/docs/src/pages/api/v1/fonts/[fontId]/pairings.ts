export const prerender = false;

import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Registry cache
// ---------------------------------------------------------------------------

interface FontEntry {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  pairing: { recommended: string[] };
  [key: string]: unknown;
}

interface Registry {
  fonts: FontEntry[];
}

function loadRegistry(): Map<string, FontEntry> {
  const registryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../../../../packages/fonts/data/registry.json'
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
// GET /api/v1/fonts/[fontId]/pairings
// ---------------------------------------------------------------------------

export const GET: APIRoute = ({ params }) => {
  const fontId = params.fontId?.toLowerCase() ?? '';
  const registry = getRegistry();
  const font = registry.get(fontId);

  if (!font) {
    return new Response(
      JSON.stringify({ error: 'Font not found', status: 404 }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const recommendedIds: string[] = font.pairing?.recommended ?? [];

  // Enrich recommended IDs with slim font data where available
  const pairings = recommendedIds.map((id) => {
    const paired = registry.get(id.toLowerCase());
    if (paired) {
      return {
        id: paired.id,
        family: paired.family,
        category: paired.category,
        variable: paired.variable,
      };
    }
    // Fallback: return the raw ID if not found in registry
    return { id, family: id, category: null, variable: null };
  });

  return new Response(
    JSON.stringify({
      fontId: font.id,
      family: font.family,
      pairings,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
};
