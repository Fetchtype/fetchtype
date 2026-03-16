export const prerender = false;

import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Registry cache — loaded once at cold start
// ---------------------------------------------------------------------------

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
  pairing: { recommended: string[] };
  license: unknown;
  install: unknown;
}

interface Registry {
  version: string;
  generatedAt: string;
  count: number;
  fonts: FontEntry[];
}

function loadRegistry(): FontEntry[] {
  // Resolve relative to this source file so it works whether built or not.
  const registryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../../packages/fonts/data/registry.json'
  );
  const raw = readFileSync(registryPath, 'utf-8');
  const parsed = JSON.parse(raw) as Registry;
  return parsed.fonts;
}

let _cache: FontEntry[] | null = null;

function getRegistry(): FontEntry[] {
  if (!_cache) {
    _cache = loadRegistry();
  }
  return _cache;
}

// ---------------------------------------------------------------------------
// Slim projection returned in list responses
// ---------------------------------------------------------------------------

interface SlimFont {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  weights: number[];
  subsetsCount: number;
  source: string;
  tags: string[];
  contexts: string[];
}

function toSlim(font: FontEntry): SlimFont {
  return {
    id: font.id,
    family: font.family,
    category: font.category,
    variable: font.variable,
    weights: font.weights,
    subsetsCount: font.subsets.length,
    source: font.source,
    tags: font.tags,
    contexts: font.contexts,
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/fonts
// ---------------------------------------------------------------------------

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams;

  const page = Math.max(1, parseInt(q.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.get('limit') ?? '20', 10) || 20));
  const category = q.get('category')?.toLowerCase() ?? null;
  const variableParam = q.get('variable');
  const search = q.get('search')?.toLowerCase() ?? null;
  const context = q.get('context')?.toLowerCase() ?? null;

  let fonts = getRegistry();

  // Filter: category
  if (category) {
    fonts = fonts.filter((f) => f.category.toLowerCase() === category);
  }

  // Filter: variable
  if (variableParam !== null) {
    const wantVariable = variableParam === 'true' || variableParam === '1';
    fonts = fonts.filter((f) => f.variable === wantVariable);
  }

  // Filter: context
  if (context) {
    fonts = fonts.filter((f) =>
      f.contexts.some((c) => c.toLowerCase() === context)
    );
  }

  // Filter: free-text search on family, tags, contexts
  if (search) {
    fonts = fonts.filter(
      (f) =>
        f.family.toLowerCase().includes(search) ||
        f.tags.some((t) => t.toLowerCase().includes(search)) ||
        f.contexts.some((c) => c.toLowerCase().includes(search))
    );
  }

  const total = fonts.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const pageData = fonts.slice(offset, offset + limit).map(toSlim);

  const body = JSON.stringify({
    data: pageData,
    pagination: { page, limit, total, totalPages },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '99',
      'Cache-Control': 'public, max-age=60',
    },
  });
};
