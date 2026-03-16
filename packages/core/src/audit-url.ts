/**
 * URL-based typography audit (F052).
 *
 * Uses fetch() to download HTML and linked CSS, then applies the same
 * detection rules as the directory scanner.
 *
 * LIMITATIONS:
 * - Cannot detect computed styles (window.getComputedStyle) without a real browser.
 * - Cannot measure CLS directly — only detects structural risk indicators.
 * - Redirects, auth-gated pages, and single-page apps (JS-rendered) will have
 *   limited coverage. Use the --dir scanner against source files for full coverage.
 * - Only follows <link rel="stylesheet"> and <style> tags in the initial HTML.
 *   Dynamically injected CSS (e.g. via JavaScript) is invisible to this scanner.
 */

import type { AuditResult, AuditIssue, DetectedFont } from './audit.js';
import { generateCorrectedTokens, formatAuditMigrationGuide } from './audit.js';

// ---------------------------------------------------------------------------
// Helpers (duplicated lightly from audit.ts to keep this file self-contained)
// ---------------------------------------------------------------------------

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function normalizeFamily(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

function parseGoogleFontsFamilies(url: string): string[] {
  const families: string[] = [];
  const re = /family=([^&;'"\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(url)) !== null) {
    const segment = match[1];
    if (!segment) continue;
    const name = segment.split(':')[0] ?? segment;
    families.push(decodeURIComponent(name).replace(/\+/g, ' '));
  }
  return families;
}

function upsertFont(
  acc: Map<string, DetectedFont>,
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
  } else {
    acc.set(key, { family, weights: [...weights], source, hasDisplay, locations: [location] });
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'fetchtype-audit/1.0 (https://fetchtype.dev)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

function scanCssContent(
  content: string,
  source: string,
  issues: AuditIssue[],
  fonts: Map<string, DetectedFont>,
): void {
  // @import for Google Fonts
  const importRe = /@import\s+url\(['"]?(https?:\/\/fonts\.googleapis\.com[^'")\s]*)/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const ln = lineNumber(content, m.index);
    const url = m[1] ?? '';
    const hasDisplay = /[?&]display=/.test(url);

    issues.push({
      rule: 'audit.render-blocking',
      severity: 'error',
      file: source,
      line: ln,
      message: '@import used for Google Fonts — render-blocking on critical path.',
      fix: 'Replace @import with <link rel="preconnect"> + <link rel="stylesheet"> in HTML head.',
    });

    issues.push({
      rule: 'audit.google-cdn',
      severity: 'warning',
      file: source,
      line: ln,
      message: 'Fonts loaded from fonts.googleapis.com — exposes visitor IPs to Google (GDPR).',
      fix: 'Self-host via Fontsource.',
    });

    if (!hasDisplay) {
      issues.push({
        rule: 'audit.missing-font-display',
        severity: 'warning',
        file: source,
        line: ln,
        message: 'Google Fonts URL missing &display= parameter — FOIT risk.',
        fix: 'Add &display=swap to the URL.',
      });
    }

    for (const family of parseGoogleFontsFamilies(url)) {
      upsertFont(fonts, family, 'google-cdn', [400], hasDisplay, source);
    }
  }

  // @font-face blocks
  const faceRe = /@font-face\s*\{([^}]+)\}/g;
  while ((m = faceRe.exec(content)) !== null) {
    const block = m[1] ?? '';
    const ln = lineNumber(content, m.index);

    const familyMatch = /font-family\s*:\s*(['"]?)([^'";]+)\1/.exec(block);
    const family = familyMatch ? normalizeFamily(familyMatch[2] ?? '') : 'unknown';
    const hasDisplay = /font-display\s*:/.test(block);

    upsertFont(fonts, family, 'font-face', [400], hasDisplay, source);

    if (!hasDisplay) {
      issues.push({
        rule: 'audit.no-font-display',
        severity: 'error',
        file: source,
        line: ln,
        message: `@font-face for "${family}" missing font-display — FOIT risk.`,
        fix: 'Add font-display: swap; to this @font-face rule.',
      });
    }

    if (!/unicode-range\s*:/.test(block)) {
      issues.push({
        rule: 'audit.no-subset',
        severity: 'warning',
        file: source,
        line: ln,
        message: `@font-face for "${family}" has no unicode-range restriction — full font loaded.`,
        fix: 'Add unicode-range restriction or switch to Fontsource.',
      });
    }
  }
}

function scanHtmlContent(
  html: string,
  pageUrl: string,
  issues: AuditIssue[],
  fonts: Map<string, DetectedFont>,
): string[] {
  const cssLinks: string[] = [];

  // <link rel="stylesheet" href="...">
  const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const hrefMatch = /href=["']([^"']+)["']/.exec(m[0]);
    if (hrefMatch?.[1]) {
      cssLinks.push(resolveUrl(pageUrl, hrefMatch[1]));
    }
  }

  // <link> for Google Fonts
  const gfLinkRe = /<link[^>]+href=["']https?:\/\/fonts\.googleapis\.com\/css[^"']*["'][^>]*>/gi;
  while ((m = gfLinkRe.exec(html)) !== null) {
    const ln = lineNumber(html, m.index);
    const hrefMatch = /href=["']([^"']+)["']/.exec(m[0]);
    const url = hrefMatch?.[1] ?? '';
    const hasDisplay = /[?&]display=/.test(url);

    issues.push({
      rule: 'audit.google-cdn',
      severity: 'warning',
      file: pageUrl,
      line: ln,
      message: 'Google Fonts <link> detected — GDPR exposure.',
      fix: 'Self-host via Fontsource.',
    });

    if (!hasDisplay) {
      issues.push({
        rule: 'audit.missing-font-display',
        severity: 'warning',
        file: pageUrl,
        line: ln,
        message: 'Google Fonts <link> missing &display= parameter — FOIT risk.',
        fix: 'Add &display=swap to the URL.',
      });
    }

    for (const family of parseGoogleFontsFamilies(url)) {
      upsertFont(fonts, family, 'google-cdn', [400], hasDisplay, pageUrl);
    }
  }

  // <style> blocks
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html)) !== null) {
    if (m[1]) {
      scanCssContent(m[1], `${pageUrl} <style>`, issues, fonts);
    }
  }

  return cssLinks;
}

// ---------------------------------------------------------------------------
// Main URL audit function
// ---------------------------------------------------------------------------

/**
 * Audit a URL for typography issues.
 *
 * Fetches the page HTML, extracts linked CSS files, and applies static
 * detection rules equivalent to the directory scanner.
 *
 * NOTE: This function cannot detect:
 * - Computed/applied styles (requires a real browser runtime)
 * - JavaScript-injected CSS or fonts
 * - CLS measurements (requires PerformanceObserver in a browser)
 * - Fonts loaded conditionally based on user interaction
 */
export async function auditUrl(url: string): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const fonts = new Map<string, DetectedFont>();

  const cssLinksFound: string[] = [];
  let htmlFetched = false;

  // Fetch and scan HTML
  const html = await fetchText(url);
  if (html) {
    htmlFetched = true;
    const linkedCss = scanHtmlContent(html, url, issues, fonts);
    cssLinksFound.push(...linkedCss);
  } else {
    issues.push({
      rule: 'audit.fetch-failed',
      severity: 'error',
      file: url,
      message: `Could not fetch "${url}" — check that the URL is accessible.`,
    });
  }

  // Fetch and scan linked CSS (skip Google Fonts CDN — it requires a browser to resolve)
  let cssCount = 0;
  for (const cssUrl of cssLinksFound) {
    if (cssUrl.includes('fonts.googleapis.com')) continue;
    const css = await fetchText(cssUrl);
    if (css) {
      cssCount++;
      scanCssContent(css, cssUrl, issues, fonts);
    }
  }

  const fontsDetected = [...fonts.values()];
  const result: AuditResult = {
    scanned: {
      cssFiles: cssCount,
      tailwindConfigs: 0,
      htmlFiles: htmlFetched ? 1 : 0,
      packageJsons: 0,
      totalFiles: cssCount + (htmlFetched ? 1 : 0),
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
