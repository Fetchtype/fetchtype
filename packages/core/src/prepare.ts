/**
 * Font Build Pipeline — Phase 3 (F055-F057)
 *
 * Downloads, processes, and generates production-ready font assets from
 * Google Fonts, including WOFF2 files, @font-face CSS, fallback CSS,
 * preload tags, and a manifest.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { resolveFont } from '@fetchtype/fonts';
import type { FontEntry } from '@fetchtype/types';

import { generateFallbackCSS as generateFallbackCSSFromCore } from './fallback.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrepareOptions = {
  fontId: string;
  weights?: number[];
  subsets?: string[];
  outputDir?: string;
  formats?: ('woff2' | 'woff')[];
  fontDisplay?: 'swap' | 'block' | 'fallback' | 'optional' | 'auto';
  generateFallbacks?: boolean;
  performanceBudget?: number;
  tokenFile?: string;
};

export type PrepareManifest = {
  fontId: string;
  family: string;
  version: string;
  generatedAt: string;
  files: Array<{
    path: string;
    weight: number;
    style: 'normal' | 'italic';
    subset: string;
    format: 'woff2' | 'woff';
    size: number;
  }>;
  css: {
    fontFace: string;
    fallback: string;
    preload: string;
  };
  performance: {
    totalSize: number;
    budgetUsed: number;
    budgetExceeded: boolean;
    budgetLimit: number;
  };
  preloadTags: string[];
  tokenPatch?: object;
};

// ---------------------------------------------------------------------------
// Internal types for parsed CSS2 API font faces
// ---------------------------------------------------------------------------

type ParsedFontFace = {
  subset: string;
  weight: number;
  style: 'normal' | 'italic';
  src: string;
  unicodeRange: string;
};

// ---------------------------------------------------------------------------
// Google Fonts CSS2 API helpers
// ---------------------------------------------------------------------------

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch the Google Fonts CSS2 response for a given family / weights.
 * Uses a desktop UA so we always get WOFF2.
 */
async function fetchGoogleFontsCSS(
  family: string,
  weights: number[],
  style: 'normal' | 'italic',
): Promise<string> {
  const familyEncoded = encodeURIComponent(family);
  let url: string;

  if (style === 'italic') {
    // For italic, use ital,wght axis with 1,weight format
    const weightParam = weights.map((w) => `0,${w};1,${w}`).join(';');
    url = `https://fonts.googleapis.com/css2?family=${familyEncoded}:ital,wght@${weightParam}&display=swap`;
  } else {
    // For normal, just use wght axis with weight values
    const weightParam = weights.join(';');
    url = `https://fonts.googleapis.com/css2?family=${familyEncoded}:wght@${weightParam}&display=swap`;
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `Google Fonts API returned ${response.status} for "${family}"`,
    );
  }

  return response.text();
}

/**
 * Parse the CSS2 API response into structured font face descriptors.
 * Each @font-face block is preceded by a subset comment like "/* latin *\/".
 */
export function parseGoogleFontsCSS(css: string): ParsedFontFace[] {
  const results: ParsedFontFace[] = [];

  const blockPattern = /\/\*\s*([^*]+?)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(css)) !== null) {
    const subset = match[1]?.trim() ?? 'latin';
    const body = match[2] ?? '';

    const weightMatch = body.match(/font-weight:\s*(\d+)/);
    const weight = weightMatch ? Number(weightMatch[1]) : 400;

    const styleMatch = body.match(/font-style:\s*(normal|italic)/);
    const style: 'normal' | 'italic' =
      styleMatch?.[1] === 'italic' ? 'italic' : 'normal';

    const srcMatch = body.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
    if (!srcMatch) continue;
    const src = srcMatch[1]?.trim() ?? '';

    const rangeMatch = body.match(/unicode-range:\s*([^;]+);/);
    const unicodeRange = rangeMatch?.[1]?.trim() ?? '';

    results.push({ subset, weight, style, src, unicodeRange });
  }

  return results;
}

/**
 * Download a file from a URL and return its content as bytes.
 */
async function downloadFile(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Build a safe filename for a font file.
 * Pattern: {family-kebab}-{subset}-{weight}-{style}.woff2
 */
function buildFontFileName(
  family: string,
  subset: string,
  weight: number,
  style: 'normal' | 'italic',
  format: 'woff2' | 'woff',
): string {
  const familySlug = family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const subsetSlug = subset.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${familySlug}-${subsetSlug}-${weight}-${style}.${format}`;
}

// ---------------------------------------------------------------------------
// CSS generators (exported)
// ---------------------------------------------------------------------------

/**
 * Generate @font-face CSS from a PrepareManifest.
 */
export function generateFontFaceCSS(manifest: PrepareManifest): string {
  const lines: string[] = [
    '/* Generated by fetchtype — @font-face declarations */',
  ];

  for (const file of manifest.files) {
    const fileName = file.path.split('/').pop() ?? file.path;
    lines.push('');
    lines.push('@font-face {');
    lines.push(`  font-family: '${manifest.family}';`);
    lines.push(`  font-style: ${file.style};`);
    lines.push(`  font-weight: ${file.weight};`);
    lines.push(`  font-display: swap;`);
    lines.push(`  src: url('./${fileName}') format('${file.format}');`);
    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Generate HTML preload tags from a PrepareManifest.
 */
export function generatePreloadTags(manifest: PrepareManifest): string {
  const lines: string[] = [
    '<!-- Generated by fetchtype — font preload tags -->',
  ];

  for (const tag of manifest.preloadTags) {
    lines.push(tag);
  }

  return lines.join('\n');
}

/**
 * Generate fallback CSS for a font using the core fallback engine.
 */
export function generateFallbackCSS(
  fontId: string,
  _family: string,
  _category: string,
): string {
  const entry = resolveFont(fontId);
  if (!entry) {
    return `/* fetchtype: fallback CSS unavailable — "${fontId}" not found in registry */`;
  }

  return generateFallbackCSSFromCore(entry, {
    safariWrap: true,
    compact: false,
    includeStack: true,
    selector: 'body',
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildPreloadTagsList(
  files: PrepareManifest['files'],
  primaryWeights: number[],
  primarySubset: string,
): string[] {
  const criticalFiles = files.filter(
    (f) =>
      f.subset === primarySubset &&
      primaryWeights.includes(f.weight) &&
      f.style === 'normal',
  );

  return criticalFiles.map(
    (f) =>
      `<link rel="preload" href="${f.path}" as="font" type="font/woff2" crossorigin="anonymous">`,
  );
}

async function updateTokenFile(
  tokenFile: string,
  entry: FontEntry,
): Promise<object | undefined> {
  let raw: unknown;
  try {
    const contents = await readFile(tokenFile, 'utf-8');
    raw = JSON.parse(contents);
  } catch {
    return undefined;
  }

  if (typeof raw !== 'object' || raw === null) return undefined;

  const tokens = raw as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  const typography = tokens['typography'] as Record<string, unknown> | undefined;
  if (typography) {
    const body = typography['body'] as Record<string, unknown> | undefined;
    if (body) {
      if (Array.isArray(body['fontFamily'])) {
        const existing = body['fontFamily'] as string[];
        if (!existing.includes(entry.family)) {
          body['fontFamily'] = [entry.family, ...existing];
          patch['typography.body.fontFamily'] = body['fontFamily'];
        }
      } else if (
        typeof body['fontFamily'] === 'string' &&
        !body['fontFamily'].includes(entry.family)
      ) {
        body['fontFamily'] = [entry.family, body['fontFamily'] as string];
        patch['typography.body.fontFamily'] = body['fontFamily'];
      }
    }
  }

  await writeFile(tokenFile, `${JSON.stringify(tokens, null, 2)}\n`, 'utf-8');
  return Object.keys(patch).length > 0 ? patch : undefined;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function prepareFont(
  options: PrepareOptions,
): Promise<PrepareManifest> {
  const {
    fontId,
    weights,
    subsets = ['latin'],
    outputDir = './dist/fonts',
    formats = ['woff2'],
    fontDisplay = 'swap',
    generateFallbacks = true,
    performanceBudget = 150000,
    tokenFile,
  } = options;

  // 1. Resolve font from registry
  const entry = resolveFont(fontId);
  if (!entry) {
    throw new Error(
      `Font "${fontId}" not found in registry. Use fetchtype search to find available fonts.`,
    );
  }

  if (entry.source === 'system') {
    throw new Error(
      `Font "${entry.family}" is a system font and cannot be downloaded from Google Fonts.`,
    );
  }

  if (!entry.install.googleCdn) {
    throw new Error(
      `Font "${entry.family}" does not have a Google Fonts CDN URL.`,
    );
  }

  // 2. Determine weights
  const defaultWeights = [400, 500, 700];
  const availableWeights = entry.weights;
  const resolvedWeights = weights
    ? weights.filter((w) => availableWeights.includes(w))
    : defaultWeights.filter((w) => availableWeights.includes(w));

  if (resolvedWeights.length === 0) {
    const requested = (weights ?? defaultWeights).join(', ');
    throw new Error(
      `None of the requested weights [${requested}] are available for "${entry.family}". Available: ${availableWeights.join(', ')}`,
    );
  }

  // 3. Fetch and parse Google Fonts CSS2 API
  const normalFaces = await fetchGoogleFontsCSS(
    entry.family,
    resolvedWeights,
    'normal',
  ).then(parseGoogleFontsCSS);

  const italicFaces: ParsedFontFace[] = entry.hasItalic
    ? await fetchGoogleFontsCSS(entry.family, resolvedWeights, 'italic')
        .then(parseGoogleFontsCSS)
        .catch(() => [])
    : [];

  const allFaces = [...normalFaces, ...italicFaces];
  const filteredFaces = allFaces.filter((face) =>
    subsets.includes(face.subset),
  );

  if (filteredFaces.length === 0) {
    throw new Error(
      `No font files found for "${entry.family}" with subsets [${subsets.join(', ')}]. Available subsets: ${entry.subsets.join(', ')}`,
    );
  }

  // 4. Create output directory
  const absoluteOutputDir = resolve(outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });

  // 5. Download font files and build @font-face blocks
  const manifestFiles: PrepareManifest['files'] = [];
  const fontFaceBlocks: string[] = [
    `/* Generated by fetchtype — @font-face declarations */`,
    `/* font-display: ${fontDisplay} */`,
  ];

  for (const face of filteredFaces) {
    if (!formats.includes('woff2')) continue;

    const fileName = buildFontFileName(
      entry.family,
      face.subset,
      face.weight,
      face.style,
      'woff2',
    );
    const filePath = resolve(absoluteOutputDir, fileName);

    const buffer = await downloadFile(face.src);
    await writeFile(filePath, buffer);

    manifestFiles.push({
      path: `${outputDir}/${fileName}`,
      weight: face.weight,
      style: face.style,
      subset: face.subset,
      format: 'woff2',
      size: buffer.length,
    });

    fontFaceBlocks.push('');
    fontFaceBlocks.push(`/* ${face.subset} */`);
    fontFaceBlocks.push(`@font-face {`);
    fontFaceBlocks.push(`  font-family: '${entry.family}';`);
    fontFaceBlocks.push(`  font-style: ${face.style};`);
    fontFaceBlocks.push(`  font-weight: ${face.weight};`);
    fontFaceBlocks.push(`  font-display: ${fontDisplay};`);
    fontFaceBlocks.push(`  src: url('./${fileName}') format('woff2');`);
    if (face.unicodeRange) {
      fontFaceBlocks.push(`  unicode-range: ${face.unicodeRange};`);
    }
    fontFaceBlocks.push(`}`);
  }

  const fontFaceCSS = fontFaceBlocks.join('\n');

  // 6. Generate fallback CSS
  const fallbackCSS = generateFallbacks
    ? generateFallbackCSSFromCore(entry, {
        safariWrap: true,
        compact: false,
        includeStack: true,
        selector: 'body',
      })
    : `/* Fallback CSS generation skipped */`;

  // 7. Build preload tags
  const primarySubset = subsets[0] ?? 'latin';
  const primaryWeights = resolvedWeights.slice(0, 3);
  const preloadTags = buildPreloadTagsList(
    manifestFiles,
    primaryWeights,
    primarySubset,
  );
  const preloadHTML = [
    `<!-- Generated by fetchtype — font preload tags -->`,
    ...preloadTags,
  ].join('\n');

  // 8. Performance budget
  const totalSize = manifestFiles.reduce((sum, f) => sum + f.size, 0);
  const budgetUsed = Number(((totalSize / performanceBudget) * 100).toFixed(1));
  const budgetExceeded = totalSize > performanceBudget;

  // 9. Build manifest
  const manifest: PrepareManifest = {
    fontId: entry.id,
    family: entry.family,
    version: entry.version,
    generatedAt: new Date().toISOString(),
    files: manifestFiles,
    css: {
      fontFace: fontFaceCSS,
      fallback: fallbackCSS,
      preload: preloadHTML,
    },
    performance: {
      totalSize,
      budgetUsed,
      budgetExceeded,
      budgetLimit: performanceBudget,
    },
    preloadTags,
  };

  // 10. Write CSS and HTML artifacts
  await writeFile(
    resolve(absoluteOutputDir, 'font-face.css'),
    `${fontFaceCSS}\n`,
    'utf-8',
  );
  await writeFile(
    resolve(absoluteOutputDir, 'fallback.css'),
    `${fallbackCSS}\n`,
    'utf-8',
  );
  await writeFile(
    resolve(absoluteOutputDir, 'preload.html'),
    `${preloadHTML}\n`,
    'utf-8',
  );

  // 11. Update token file if requested
  if (tokenFile) {
    const patch = await updateTokenFile(tokenFile, entry);
    if (patch) {
      manifest.tokenPatch = patch;
    }
  }

  // 12. Write manifest
  await writeFile(
    resolve(absoluteOutputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf-8',
  );

  return manifest;
}
