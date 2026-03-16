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

interface Performance {
  estimatedPayload: number | null;
  loadingImpact: string;
  woff2Size: Record<string, number>;
  variableFileSize: number | null;
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
  performance: Performance;
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

function loadRegistryData(): { byId: Map<string, FontEntry>; list: FontEntry[] } {
  const registryPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../../../packages/fonts/data/registry.json'
  );
  const raw = readFileSync(registryPath, 'utf-8');
  const parsed = JSON.parse(raw) as Registry;
  const byId = new Map<string, FontEntry>();
  for (const font of parsed.fonts) {
    byId.set(font.id, font);
  }
  return { byId, list: parsed.fonts };
}

let _byId: Map<string, FontEntry> | null = null;
let _list: FontEntry[] | null = null;

function getRegistryById(): Map<string, FontEntry> {
  if (!_byId) {
    const data = loadRegistryData();
    _byId = data.byId;
    _list = data.list;
  }
  return _byId;
}

function getRegistryList(): FontEntry[] {
  if (!_list) {
    const data = loadRegistryData();
    _byId = data.byId;
    _list = data.list;
  }
  return _list;
}

// ---------------------------------------------------------------------------
// Valid contexts (mirrors TypographicContext in @fetchtype/types)
// ---------------------------------------------------------------------------

const VALID_CONTEXTS = ['display', 'interface', 'reading', 'mono'] as const;
type TypographicContext = (typeof VALID_CONTEXTS)[number];

// ---------------------------------------------------------------------------
// Stack selection logic
// ---------------------------------------------------------------------------

/**
 * Return fonts that support a given context, sorted by:
 * 1. Variable fonts first (more flexible)
 * 2. More weight variants (better hierarchy options)
 * 3. Smaller estimated payload (better performance)
 */
function getCandidatesForContext(context: TypographicContext): FontEntry[] {
  const list = getRegistryList();
  return list
    .filter((f) => f.contexts.includes(context))
    .sort((a, b) => {
      if (a.variable !== b.variable) return a.variable ? -1 : 1;
      if (a.weights.length !== b.weights.length) return b.weights.length - a.weights.length;
      const aPay = a.performance?.estimatedPayload ?? Infinity;
      const bPay = b.performance?.estimatedPayload ?? Infinity;
      return aPay - bPay;
    });
}

// ---------------------------------------------------------------------------
// GET /api/v2/fonts/stack?context=interface&budget=120
// Returns: recommended primary + secondary + mono fonts as a complete stack
// ---------------------------------------------------------------------------

export const GET: APIRoute = ({ url }) => {
  const contextParam = url.searchParams.get('context') ?? 'interface';
  const budgetKb = parseInt(url.searchParams.get('budget') ?? '150', 10);

  const context = VALID_CONTEXTS.includes(contextParam as TypographicContext)
    ? (contextParam as TypographicContext)
    : 'interface';

  const candidates = getCandidatesForContext(context);
  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({ error: `No fonts found for context: ${context}` }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  const primary = candidates[0];
  const byId = getRegistryById();

  // Pick pairings from primary font's pairing.recommended
  const pairings: PairingRecommendation[] = primary.pairing?.recommended ?? [];
  const bodyPairing = pairings.find((p) => p.role === 'body') ?? pairings.find((p) => p.role === 'heading') ?? null;
  const monoPairing = pairings.find((p) => p.role === 'mono') ?? null;

  const secondaryFont = bodyPairing ? byId.get(bodyPairing.fontId) ?? null : null;
  const monoFont = monoPairing ? byId.get(monoPairing.fontId) ?? null : null;

  // Estimate total payload
  const primaryPayload = primary.performance?.estimatedPayload ?? 0;
  const secondaryPayload = secondaryFont?.performance?.estimatedPayload ?? 0;
  const monoPayload = monoFont?.performance?.estimatedPayload ?? 0;
  const totalPayloadKb = Math.round((primaryPayload + secondaryPayload + monoPayload) / 1024);

  const stack = {
    context,
    budgetKb,
    withinBudget: budgetKb > 0 ? totalPayloadKb <= budgetKb : null,
    totalEstimatedPayloadKb: totalPayloadKb,
    primary: {
      id: primary.id,
      family: primary.family,
      role: 'heading',
      category: primary.category,
      variable: primary.variable,
      weights: primary.weights,
      estimatedPayloadKb: Math.round(primaryPayload / 1024),
    },
    secondary: secondaryFont
      ? {
          id: secondaryFont.id,
          family: secondaryFont.family,
          role: 'body',
          category: secondaryFont.category,
          variable: secondaryFont.variable,
          weights: secondaryFont.weights,
          estimatedPayloadKb: Math.round(secondaryPayload / 1024),
          pairingRationale: bodyPairing?.rationale ?? null,
          pairingConfidence: bodyPairing?.confidence ?? null,
        }
      : null,
    mono: monoFont
      ? {
          id: monoFont.id,
          family: monoFont.family,
          role: 'mono',
          category: monoFont.category,
          variable: monoFont.variable,
          weights: monoFont.weights,
          estimatedPayloadKb: Math.round(monoPayload / 1024),
          pairingRationale: monoPairing?.rationale ?? null,
          pairingConfidence: monoPairing?.confidence ?? null,
        }
      : null,
  };

  return new Response(JSON.stringify(stack), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
};
