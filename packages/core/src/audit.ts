/**
 * Typography Audit Engine — Phase 2
 *
 * Static analysis scanner that inspects a project directory for typography
 * issues: render-blocking fonts, missing font-display, GDPR-risky CDN loads,
 * inconsistent scales, and more.
 *
 * Design decisions:
 * - Regex-based parsing only (no AST) for zero extra dependencies.
 * - node:fs/promises + node:path for file I/O.
 * - resolveFont from @fetchtype/fonts for registry lookups.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { resolveFont } from '@fetchtype/fonts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AuditIssue = {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  fix?: string;
};

export type DetectedFont = {
  family: string;
  weights: number[];
  source: 'google-cdn' | 'fontsource' | 'font-face' | 'system' | 'unknown';
  hasDisplay: boolean;
  locations: string[];
};

export type AuditResult = {
  scanned: {
    cssFiles: number;
    tailwindConfigs: number;
    htmlFiles: number;
    packageJsons: number;
    totalFiles: number;
  };
  fontsDetected: DetectedFont[];
  issues: AuditIssue[];
  generatedTokens?: object;
  migrationGuide: string[];
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type FileSet = {
  css: string[];
  tailwind: string[];
  html: string[];
  packageJsons: string[];
};

type FontAccumulator = Map<string, DetectedFont>;

// ---------------------------------------------------------------------------
// Constants / patterns
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.nuxt', 'out', 'build', '.astro', '.turbo', '.cache']);

// Fontsource package pattern
const FONTSOURCE_PKG_RE = /^@fontsource(?:-variable)?\/(.+)/;

// Google Fonts family extraction from URL
const GF_FAMILY_SEGMENT_RE = /family=([^&;'"\s]+)/g;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function normalizeFamily(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

function parseGoogleFontsFamilies(url: string): string[] {
  const families: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(GF_FAMILY_SEGMENT_RE.source, 'g');
  while ((match = re.exec(url)) !== null) {
    const segment = match[1];
    if (!segment) continue;
    const name = segment.split(':')[0] ?? segment;
    families.push(decodeURIComponent(name).replace(/\+/g, ' '));
  }
  return families;
}

function extractWeightsFromGfUrl(url: string, family: string): number[] {
  const encodedFamily = family.replace(/ /g, '+');
  const familyPattern = new RegExp(`family=${encodedFamily}:(?:[^&'"\\s]*)`, 'i');
  const m = familyPattern.exec(url);
  if (!m) return [400];
  const after = m[0].split('@')[1] ?? '';
  const weightNums = [...after.matchAll(/\d{3}/g)].map((x) => Number(x[0]));
  const seen = new Set<number>();
  return weightNums.filter((w) => {
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });
}

function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return null;
  const full =
    raw.length === 4
      ? raw
          .slice(1)
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
      : raw.slice(1);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function linearise(c: number): number {
  const n = c / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = luminance(fgRgb);
  const l2 = luminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function upsertFont(
  acc: FontAccumulator,
  family: string,
  source: DetectedFont['source'],
  weights: number[],
  hasDisplay: boolean,
  location: string,
): void {
  const key = family.toLowerCase();
  const existing = acc.get(key);
  if (existing) {
    for (const w of weights) {
      if (!existing.weights.includes(w)) existing.weights.push(w);
    }
    if (!existing.locations.includes(location)) existing.locations.push(location);
    if (hasDisplay) existing.hasDisplay = true;
    const priority: Record<DetectedFont['source'], number> = {
      'google-cdn': 4,
      fontsource: 3,
      'font-face': 2,
      system: 1,
      unknown: 0,
    };
    if (priority[source] > priority[existing.source]) {
      existing.source = source;
    }
  } else {
    acc.set(key, {
      family,
      weights: [...weights],
      source,
      hasDisplay,
      locations: [location],
    });
  }
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

async function collectFiles(dir: string): Promise<FileSet> {
  const files: FileSet = { css: [], tailwind: [], html: [], packageJsons: [] };

  async function walk(current: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(current, { withFileTypes: true, encoding: 'utf8' }) as import('node:fs').Dirent[];
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name as string;
      const fullPath = join(current, name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(name)) continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(name).toLowerCase();
        const base = name.toLowerCase();

        if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less') {
          files.css.push(fullPath);
        } else if (
          base.startsWith('tailwind.config')
          && (ext === '.js' || ext === '.ts' || ext === '.cjs' || ext === '.mjs' || ext === '')
        ) {
          files.tailwind.push(fullPath);
        } else if (ext === '.html' || ext === '.jsx' || ext === '.tsx' || ext === '.vue' || ext === '.svelte') {
          files.html.push(fullPath);
        } else if (base === 'package.json') {
          files.packageJsons.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files;
}

// ---------------------------------------------------------------------------
// CSS scanner
// ---------------------------------------------------------------------------

function scanCss(
  content: string,
  filePath: string,
  rootDir: string,
  issues: AuditIssue[],
  fonts: FontAccumulator,
): void {
  const rel = relative(rootDir, filePath);

  // --- @import render-blocking (Google Fonts) ---
  const importRe = /@import\s+url\(['"]?(https?:\/\/fonts\.googleapis\.com[^'")\s]*)/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const ln = lineNumber(content, m.index);
    issues.push({
      rule: 'audit.render-blocking',
      severity: 'error',
      file: rel,
      line: ln,
      message: '@import used for Google Fonts loading — render-blocking on critical path.',
      fix: 'Replace @import with a <link rel="preconnect"> + <link rel="stylesheet"> in HTML, or use Fontsource.',
    });

    const url = m[1] ?? '';
    const hasDisplay = /[?&]display=/.test(url);
    const families = parseGoogleFontsFamilies(url);
    for (const family of families) {
      const weights = extractWeightsFromGfUrl(url, family);
      upsertFont(fonts, family, 'google-cdn', weights.length > 0 ? weights : [400], hasDisplay, rel);
    }

    if (!hasDisplay) {
      issues.push({
        rule: 'audit.missing-font-display',
        severity: 'warning',
        file: rel,
        line: ln,
        message: 'Google Fonts @import URL missing &display= parameter — FOIT risk.',
        fix: 'Add &display=swap (or =optional) to the Google Fonts URL.',
      });
    }

    issues.push({
      rule: 'audit.google-cdn',
      severity: 'warning',
      file: rel,
      line: ln,
      message: 'Fonts loaded from fonts.googleapis.com — exposes visitor IPs to Google (GDPR).',
      fix: 'Self-host via Fontsource or download fonts and serve from your own CDN.',
    });
  }

  // --- @font-face blocks ---
  const faceRe = /@font-face\s*\{([^}]+)\}/g;
  while ((m = faceRe.exec(content)) !== null) {
    const block = m[1] ?? '';
    const ln = lineNumber(content, m.index);

    const familyMatch = /font-family\s*:\s*(['"]?)([^'";]+)\1/.exec(block);
    const family = familyMatch ? normalizeFamily(familyMatch[2] ?? '') : 'unknown';

    const hasDisplay = /font-display\s*:\s*([^;]+)/.test(block);

    const weightMatch = /font-weight\s*:\s*(\d+)(?:\s+(\d+))?/.exec(block);
    const weights: number[] = [];
    if (weightMatch) {
      weights.push(Number(weightMatch[1]));
      if (weightMatch[2]) weights.push(Number(weightMatch[2]));
    } else {
      weights.push(400);
    }

    upsertFont(fonts, family, 'font-face', weights, hasDisplay, rel);

    if (!hasDisplay) {
      issues.push({
        rule: 'audit.no-font-display',
        severity: 'error',
        file: rel,
        line: ln,
        message: `@font-face for "${family}" missing font-display — FOIT risk on slow connections.`,
        fix: 'Add font-display: swap; (or optional) to this @font-face rule.',
      });
    }

    if (!/unicode-range\s*:/.test(block)) {
      issues.push({
        rule: 'audit.no-subset',
        severity: 'warning',
        file: rel,
        line: ln,
        message: `@font-face for "${family}" has no unicode-range restriction — loads full font file.`,
        fix: 'Add unicode-range: U+0000-00FF; (or use Fontsource which does this automatically).',
      });
    }
  }

  // --- line-height values ---
  const lhRe = /line-height\s*:\s*([^;{}]+)/g;
  const lineHeights: string[] = [];
  while ((m = lhRe.exec(content)) !== null) {
    const val = (m[1] ?? '').trim();
    if (val && !val.startsWith('var(') && !val.startsWith('calc(')) {
      lineHeights.push(val);
    }
  }

  const uniqueLh = [...new Set(lineHeights.map((lh) => lh.replace(/\s+/g, ' ')))];
  if (uniqueLh.length > 2) {
    issues.push({
      rule: 'audit.inconsistent-line-height',
      severity: 'warning',
      file: rel,
      message: `Multiple line-height values detected (${uniqueLh.slice(0, 4).join(', ')}${uniqueLh.length > 4 ? '…' : ''}) — consider a consistent scale.`,
      fix: 'Define line-height values as CSS custom properties or token references.',
    });
  }

  // --- font-size values ---
  const sizeRe = /font-size\s*:\s*([^;{}]+)/g;
  const fontSizes: string[] = [];
  while ((m = sizeRe.exec(content)) !== null) {
    const val = (m[1] ?? '').trim();
    if (val && !val.startsWith('var(') && !val.startsWith('calc(')) {
      fontSizes.push(val);
    }
  }

  const pxSizes = fontSizes
    .map((s) => {
      const parsed = /^(\d+(?:\.\d+)?)px$/.exec(s);
      return parsed ? Number(parsed[1]) : null;
    })
    .filter((n): n is number => n !== null);

  if (pxSizes.length >= 4) {
    const uniquePx = [...new Set(pxSizes)].sort((a, b) => a - b);
    if (uniquePx.length >= 5) {
      issues.push({
        rule: 'audit.inconsistent-scale',
        severity: 'warning',
        file: rel,
        message: `Many distinct font-size values (${uniquePx.slice(0, 5).join('px, ')}px…) — no consistent type scale detected.`,
        fix: 'Adopt a modular type scale and define sizes as CSS variables via fetchtype.',
      });
    }
  }

  // --- Colour contrast estimation ---
  const colors: string[] = [];
  const bgColors: string[] = [];

  const colorRe = /(?:^|[;\s{])color\s*:\s*(#[0-9a-fA-F]{3,6})/gm;
  while ((m = colorRe.exec(content)) !== null) {
    if (m[1]) colors.push(m[1]);
  }
  const bgRe = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6})/gm;
  while ((m = bgRe.exec(content)) !== null) {
    if (m[1]) bgColors.push(m[1]);
  }

  for (const fg of colors.slice(0, 5)) {
    for (const bg of bgColors.slice(0, 5)) {
      const ratio = contrastRatio(fg, bg);
      if (ratio !== null && ratio < 4.5) {
        issues.push({
          rule: 'audit.contrast-warning',
          severity: 'warning',
          file: rel,
          message: `Colour pair ${fg} on ${bg} may fail WCAG AA (estimated ratio ${ratio}:1 < 4.5).`,
          fix: 'Increase colour contrast between text and background to at least 4.5:1.',
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tailwind config scanner
// ---------------------------------------------------------------------------

function scanTailwind(
  content: string,
  filePath: string,
  rootDir: string,
  _issues: AuditIssue[],
  fonts: FontAccumulator,
): void {
  const rel = relative(rootDir, filePath);

  const familyMatch = /fontFamily\s*:\s*\{([^}]+)\}/.exec(content);
  if (familyMatch) {
    const block = familyMatch[1] ?? '';
    const keyRe = /(\w+)\s*:\s*[\[']([^'\]]+)/g;
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(block)) !== null) {
      const familyRaw = normalizeFamily(m[2] ?? '');
      if (familyRaw) {
        upsertFont(fonts, familyRaw, 'unknown', [400], false, rel);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// HTML / JSX scanner
// ---------------------------------------------------------------------------

function scanHtml(
  content: string,
  filePath: string,
  rootDir: string,
  issues: AuditIssue[],
  fonts: FontAccumulator,
): void {
  const rel = relative(rootDir, filePath);

  // <link> tags for Google Fonts
  const linkRe = /<link[^>]+href=["']https?:\/\/fonts\.googleapis\.com\/css[^"']*["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(content)) !== null) {
    const tag = m[0];
    const ln = lineNumber(content, m.index);
    const hrefMatch = /href=["']([^"']+)["']/.exec(tag);
    const url = hrefMatch?.[1] ?? '';

    issues.push({
      rule: 'audit.google-cdn',
      severity: 'warning',
      file: rel,
      line: ln,
      message: 'Google Fonts <link> tag — exposes visitor IPs to Google (GDPR exposure).',
      fix: 'Self-host via Fontsource or download fonts and serve from your own CDN.',
    });

    const hasDisplay = /[?&]display=/.test(url);
    if (!hasDisplay) {
      issues.push({
        rule: 'audit.missing-font-display',
        severity: 'warning',
        file: rel,
        line: ln,
        message: 'Google Fonts <link> missing &display= parameter — browser default is block, causing FOIT.',
        fix: 'Add &display=swap to the Google Fonts URL (e.g. ?family=Inter&display=swap).',
      });
    }

    const families = parseGoogleFontsFamilies(url);
    for (const family of families) {
      const weights = extractWeightsFromGfUrl(url, family);
      upsertFont(fonts, family, 'google-cdn', weights.length > 0 ? weights : [400], hasDisplay, rel);
    }
  }

  // Inline font-family styles
  const inlineRe = /style=["'][^"']*font-family\s*:\s*([^;'"]+)/gi;
  while ((m = inlineRe.exec(content)) !== null) {
    const family = normalizeFamily(m[1]?.split(',')[0] ?? '');
    if (family) {
      const ln = lineNumber(content, m.index);
      issues.push({
        rule: 'audit.inline-font-style',
        severity: 'info',
        file: rel,
        line: ln,
        message: `Inline font-family style "${family}" — hard to override and not design-token-driven.`,
        fix: 'Replace inline style with a CSS class using a token-driven font-family variable.',
      });
      upsertFont(fonts, family, 'unknown', [400], false, rel);
    }
  }
}

// ---------------------------------------------------------------------------
// package.json scanner
// ---------------------------------------------------------------------------

function scanPackageJson(
  content: string,
  filePath: string,
  rootDir: string,
  fonts: FontAccumulator,
): void {
  const rel = relative(rootDir, filePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return;
  }

  if (typeof parsed !== 'object' || parsed === null) return;

  const pkg = parsed as Record<string, unknown>;
  const allDeps: Record<string, unknown> = {};

  for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const section = pkg[key];
    if (section && typeof section === 'object') {
      Object.assign(allDeps, section);
    }
  }

  for (const depName of Object.keys(allDeps)) {
    const match = FONTSOURCE_PKG_RE.exec(depName);
    if (match) {
      const familySlug = match[1] ?? '';
      const family = familySlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      upsertFont(fonts, family, 'fontsource', [400], false, rel);
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-reference analysis
// ---------------------------------------------------------------------------

function crossReference(fonts: FontAccumulator, issues: AuditIssue[]): void {
  for (const [, font] of fonts) {
    if (font.source === 'google-cdn' || font.source === 'fontsource') {
      issues.push({
        rule: 'audit.no-fallback-metrics',
        severity: 'warning',
        file: font.locations[0] ?? '<unknown>',
        message: `"${font.family}" loaded via ${font.source} without fallback metric overrides — CLS risk during font swap.`,
        fix: `Run \`fetchtype resolve "${font.family}" --fallback\` to generate platform-aware fallback CSS.`,
      });
    }

    const registryEntry = resolveFont(font.family);
    if (registryEntry && font.weights.length > 3) {
      issues.push({
        rule: 'audit.unused-weights',
        severity: 'info',
        file: font.locations[0] ?? '<unknown>',
        message: `"${font.family}" loads ${font.weights.length} weights (${font.weights.join(', ')}) — verify all are used to reduce payload.`,
        fix: 'Audit which font weights are actually applied in CSS and remove unused ones.',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

export function generateCorrectedTokens(result: AuditResult): object {
  const primaryFont = result.fontsDetected.find((f) => f.source !== 'system') ?? result.fontsDetected[0];
  const monoFont = result.fontsDetected.find((f) => {
    const entry = resolveFont(f.family);
    return entry?.category === 'monospace';
  });

  const primaryFamily = primaryFont?.family ?? 'Inter';
  const monoFamily = monoFont?.family ?? 'JetBrains Mono';

  return {
    $schema: 'https://fetchtype.dev/schema/v1',
    _generated: {
      by: 'fetchtype audit',
      from: 'static-analysis',
      note: 'Review and validate before use: fetchtype validate -i fetchtype.tokens.json',
    },
    typography: {
      body: {
        fontFamily: [primaryFamily, 'system-ui', 'sans-serif'],
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      heading: {
        fontFamily: [primaryFamily, 'system-ui', 'sans-serif'],
        fontSize: '1.5rem',
        fontWeight: 700,
        lineHeight: 1.25,
      },
      code: {
        fontFamily: [monoFamily, 'ui-monospace', 'monospace'],
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.7,
      },
    },
    fonts: result.fontsDetected.map((f) => ({
      family: f.family,
      source: f.source,
      weights: f.weights.sort((a, b) => a - b),
      display: 'swap',
    })),
  };
}

// ---------------------------------------------------------------------------
// Report formatters
// ---------------------------------------------------------------------------

export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [];

  lines.push('fetchtype audit report');
  lines.push('='.repeat(50));
  lines.push('');

  lines.push('  Scanned:');
  lines.push(`    ${result.scanned.cssFiles} CSS file${result.scanned.cssFiles !== 1 ? 's' : ''}`);
  lines.push(`    ${result.scanned.tailwindConfigs} Tailwind config${result.scanned.tailwindConfigs !== 1 ? 's' : ''}`);
  lines.push(`    ${result.scanned.htmlFiles} HTML/JSX file${result.scanned.htmlFiles !== 1 ? 's' : ''}`);
  lines.push(`    ${result.scanned.packageJsons} package.json file${result.scanned.packageJsons !== 1 ? 's' : ''}`);
  lines.push(`    ${result.scanned.totalFiles} total`);
  lines.push('');

  if (result.fontsDetected.length > 0) {
    lines.push('  Fonts detected:');
    for (const font of result.fontsDetected) {
      const weights = font.weights.sort((a, b) => a - b).join(', ');
      const display = font.hasDisplay ? 'display=swap' : 'no font-display';
      lines.push(`    ${font.family} (${weights}) -- ${font.source}, ${display}`);
      if (font.locations.length > 0) {
        lines.push(`      locations: ${font.locations.slice(0, 3).join(', ')}${font.locations.length > 3 ? '...' : ''}`);
      }
    }
    lines.push('');
  } else {
    lines.push('  No fonts detected.');
    lines.push('');
  }

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const infos = result.issues.filter((i) => i.severity === 'info');

  if (result.issues.length === 0) {
    lines.push('  No issues found.');
  } else {
    lines.push('  Issues:');
    for (const issue of errors) {
      const loc = issue.line ? `[${issue.file}:${issue.line}]` : `[${issue.file}]`;
      lines.push(`    x ${issue.message}  ${loc}`);
      if (issue.fix) lines.push(`      Fix: ${issue.fix}`);
    }
    for (const issue of warnings) {
      const loc = issue.line ? `[${issue.file}:${issue.line}]` : `[${issue.file}]`;
      lines.push(`    ! ${issue.message}  ${loc}`);
      if (issue.fix) lines.push(`      Fix: ${issue.fix}`);
    }
    for (const issue of infos) {
      const loc = issue.line ? `[${issue.file}:${issue.line}]` : `[${issue.file}]`;
      lines.push(`    i ${issue.message}  ${loc}`);
    }
  }

  lines.push('');
  lines.push(`  ${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}, ${infos.length} info`);

  if (result.migrationGuide.length > 0) {
    lines.push('');
    lines.push('  Migration guide:');
    for (const step of result.migrationGuide) {
      lines.push(`    -> ${step}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function formatAuditMigrationGuide(result: AuditResult): string[] {
  const steps: string[] = [];

  const hasGoogleCdn = result.fontsDetected.some((f) => f.source === 'google-cdn');
  const hasRenderBlocking = result.issues.some((i) => i.rule === 'audit.render-blocking');
  const hasNoFontDisplay = result.issues.some((i) => i.rule === 'audit.no-font-display');
  const hasMissingDisplay = result.issues.some((i) => i.rule === 'audit.missing-font-display');
  const hasNoSubset = result.issues.some((i) => i.rule === 'audit.no-subset');
  const hasNoFallbackMetrics = result.issues.some((i) => i.rule === 'audit.no-fallback-metrics');
  const hasContrastWarnings = result.issues.some((i) => i.rule === 'audit.contrast-warning');
  const hasInconsistentScale = result.issues.some((i) => i.rule === 'audit.inconsistent-scale');

  if (hasGoogleCdn || hasRenderBlocking) {
    const families = result.fontsDetected
      .filter((f) => f.source === 'google-cdn')
      .map((f) => f.family.toLowerCase().replace(/ /g, '-'));
    if (families.length > 0) {
      steps.push(`Install via Fontsource: npm i @fontsource-variable/${families[0]}${families.length > 1 ? ` @fontsource-variable/${families[1]}` : ''}`);
    } else {
      steps.push('Replace Google Fonts CDN with Fontsource for self-hosted, GDPR-compliant delivery.');
    }
  }

  if (hasRenderBlocking) {
    steps.push('Remove @import rules for fonts. Move to <link rel="preload"> in <head> or use Fontsource import.');
  }

  if (hasNoFontDisplay || hasMissingDisplay) {
    steps.push('Add font-display: swap; to all @font-face declarations. Add &display=swap to Google Fonts URLs.');
  }

  if (hasNoSubset) {
    steps.push('Add unicode-range restrictions to @font-face blocks, or migrate to Fontsource which subsets automatically.');
  }

  if (hasNoFallbackMetrics) {
    steps.push('Generate fallback metric overrides to eliminate CLS: fetchtype resolve <font> --fallback > fallback.css');
  }

  if (result.fontsDetected.length > 0) {
    steps.push(`Initialize a fetchtype token file: fetchtype init --prompt "${result.fontsDetected.map((f) => f.family).join(', ')} project"`);
    steps.push('Validate generated tokens: fetchtype validate -i fetchtype.tokens.json');
    steps.push('Build CSS variables: fetchtype build -i fetchtype.tokens.json');
  }

  if (hasContrastWarnings) {
    steps.push('Review flagged colour pairs and adjust to meet WCAG AA (4.5:1 for normal text, 3:1 for large text).');
  }

  if (hasInconsistentScale) {
    steps.push('Define a modular type scale in fetchtype.tokens.json and generate consistent heading sizes.');
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function auditDirectory(dir: string): Promise<AuditResult> {
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) {
      throw new Error(`"${dir}" is not a directory.`);
    }
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      throw new Error(`Directory "${dir}" does not exist.`);
    }
    throw error;
  }

  const files = await collectFiles(dir);
  const issues: AuditIssue[] = [];
  const fonts: FontAccumulator = new Map();

  for (const filePath of files.css) {
    let content: string;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    scanCss(content, filePath, dir, issues, fonts);
  }

  for (const filePath of files.tailwind) {
    let content: string;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    scanTailwind(content, filePath, dir, issues, fonts);
  }

  for (const filePath of files.html) {
    let content: string;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    scanHtml(content, filePath, dir, issues, fonts);
  }

  for (const filePath of files.packageJsons) {
    let content: string;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    scanPackageJson(content, filePath, dir, fonts);
  }

  crossReference(fonts, issues);

  const fontsDetected = [...fonts.values()];
  const result: AuditResult = {
    scanned: {
      cssFiles: files.css.length,
      tailwindConfigs: files.tailwind.length,
      htmlFiles: files.html.length,
      packageJsons: files.packageJsons.length,
      totalFiles:
        files.css.length +
        files.tailwind.length +
        files.html.length +
        files.packageJsons.length,
    },
    fontsDetected,
    issues,
    migrationGuide: [],
  };

  result.migrationGuide = formatAuditMigrationGuide(result);

  if (fontsDetected.length > 0) {
    result.generatedTokens = generateCorrectedTokens(result);
  }

  return result;
}
