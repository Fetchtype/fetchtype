import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { auditDirectory, generateCorrectedTokens, formatAuditReport, formatAuditMigrationGuide } from './audit.js';
import type { AuditResult } from './audit.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'fetchtype-audit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeFixture(relativePath: string, content: string): Promise<string> {
  const fullPath = join(tempDir, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  await mkdir(dir, { recursive: true });
  await writeFile(fullPath, content, 'utf8');
  return fullPath;
}

// ---------------------------------------------------------------------------
// Empty directory
// ---------------------------------------------------------------------------

describe('empty directory', () => {
  it('returns zero scanned files and no issues', async () => {
    const result = await auditDirectory(tempDir);
    expect(result.scanned.totalFiles).toBe(0);
    expect(result.issues).toHaveLength(0);
    expect(result.fontsDetected).toHaveLength(0);
    expect(result.migrationGuide).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CSS scanner — @import render-blocking
// ---------------------------------------------------------------------------

describe('CSS scanner: @import Google Fonts', () => {
  it('detects render-blocking @import', async () => {
    await writeFixture('styles/global.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
body { font-family: Inter, sans-serif; }
`);
    const result = await auditDirectory(tempDir);
    const renderBlocking = result.issues.filter((i) => i.rule === 'audit.render-blocking');
    expect(renderBlocking.length).toBeGreaterThan(0);
    expect(renderBlocking[0]!.severity).toBe('error');
    expect(renderBlocking[0]!.file).toContain('global.css');
  });

  it('flags @import as GDPR concern (google-cdn rule)', async () => {
    await writeFixture('styles/global.css', `
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');
`);
    const result = await auditDirectory(tempDir);
    const gdpr = result.issues.filter((i) => i.rule === 'audit.google-cdn');
    expect(gdpr.length).toBeGreaterThan(0);
  });

  it('flags missing &display= in @import URL', async () => {
    await writeFixture('styles/missing-display.css', `
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400');
`);
    const result = await auditDirectory(tempDir);
    const missing = result.issues.filter((i) => i.rule === 'audit.missing-font-display');
    expect(missing.length).toBeGreaterThan(0);
  });

  it('does not flag missing-font-display when display= is present', async () => {
    await writeFixture('styles/with-display.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
`);
    const result = await auditDirectory(tempDir);
    const missing = result.issues.filter((i) => i.rule === 'audit.missing-font-display');
    expect(missing).toHaveLength(0);
  });

  it('extracts font family from @import URL', async () => {
    await writeFixture('styles/fonts.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
`);
    const result = await auditDirectory(tempDir);
    const interFont = result.fontsDetected.find((f) => f.family.toLowerCase() === 'inter');
    expect(interFont).toBeDefined();
    expect(interFont?.source).toBe('google-cdn');
  });
});

// ---------------------------------------------------------------------------
// CSS scanner — @font-face
// ---------------------------------------------------------------------------

describe('CSS scanner: @font-face', () => {
  it('detects missing font-display in @font-face', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-weight: 400;
}
`);
    const result = await auditDirectory(tempDir);
    const noDisplay = result.issues.filter((i) => i.rule === 'audit.no-font-display');
    expect(noDisplay.length).toBeGreaterThan(0);
    expect(noDisplay[0]!.message).toContain('MyFont');
  });

  it('does not flag no-font-display when font-display is present', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
`);
    const result = await auditDirectory(tempDir);
    const noDisplay = result.issues.filter((i) => i.rule === 'audit.no-font-display');
    expect(noDisplay).toHaveLength(0);
  });

  it('detects missing unicode-range (no-subset)', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}
`);
    const result = await auditDirectory(tempDir);
    const noSubset = result.issues.filter((i) => i.rule === 'audit.no-subset');
    expect(noSubset.length).toBeGreaterThan(0);
  });

  it('does not flag no-subset when unicode-range is present', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF;
}
`);
    const result = await auditDirectory(tempDir);
    const noSubset = result.issues.filter((i) => i.rule === 'audit.no-subset');
    expect(noSubset).toHaveLength(0);
  });

  it('extracts font-face font as source=font-face', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'CustomSans';
  src: url('/fonts/custom.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
`);
    const result = await auditDirectory(tempDir);
    const font = result.fontsDetected.find((f) => f.family === 'CustomSans');
    expect(font).toBeDefined();
    expect(font?.source).toBe('font-face');
  });
});

// ---------------------------------------------------------------------------
// CSS scanner — inconsistent line-height
// ---------------------------------------------------------------------------

describe('CSS scanner: inconsistent line-height', () => {
  it('flags when more than 2 distinct line-height values exist in one file', async () => {
    await writeFixture('styles.css', `
body { line-height: 1.4; }
p { line-height: 1.6; }
h1 { line-height: 1.1; }
small { line-height: 1.8; }
`);
    const result = await auditDirectory(tempDir);
    const lhIssues = result.issues.filter((i) => i.rule === 'audit.inconsistent-line-height');
    expect(lhIssues.length).toBeGreaterThan(0);
  });

  it('does not flag when 2 or fewer distinct values', async () => {
    await writeFixture('styles.css', `
body { line-height: 1.5; }
h1 { line-height: 1.2; }
`);
    const result = await auditDirectory(tempDir);
    const lhIssues = result.issues.filter((i) => i.rule === 'audit.inconsistent-line-height');
    expect(lhIssues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CSS scanner — inconsistent font-size scale
// ---------------------------------------------------------------------------

describe('CSS scanner: inconsistent font-size scale', () => {
  it('flags when 5+ distinct px font-sizes are present', async () => {
    await writeFixture('styles.css', `
.a { font-size: 10px; }
.b { font-size: 13px; }
.c { font-size: 17px; }
.d { font-size: 22px; }
.e { font-size: 29px; }
.f { font-size: 38px; }
`);
    const result = await auditDirectory(tempDir);
    const scaleIssues = result.issues.filter((i) => i.rule === 'audit.inconsistent-scale');
    expect(scaleIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CSS scanner — contrast estimation
// ---------------------------------------------------------------------------

describe('CSS scanner: contrast warning', () => {
  it('flags low-contrast colour pairs', async () => {
    await writeFixture('styles.css', `
.btn {
  color: #999999;
  background: #aaaaaa;
}
`);
    const result = await auditDirectory(tempDir);
    const contrast = result.issues.filter((i) => i.rule === 'audit.contrast-warning');
    expect(contrast.length).toBeGreaterThan(0);
  });

  it('does not flag high-contrast pairs', async () => {
    await writeFixture('styles.css', `
body {
  color: #000000;
  background: #ffffff;
}
`);
    const result = await auditDirectory(tempDir);
    const contrast = result.issues.filter((i) => i.rule === 'audit.contrast-warning');
    expect(contrast).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// HTML / JSX scanner
// ---------------------------------------------------------------------------

describe('HTML scanner: Google Fonts link tags', () => {
  it('detects Google Fonts <link> tag', async () => {
    await writeFixture('index.html', `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
</head>
<body></body>
</html>`);
    const result = await auditDirectory(tempDir);
    const gdpr = result.issues.filter((i) => i.rule === 'audit.google-cdn');
    expect(gdpr.length).toBeGreaterThan(0);
  });

  it('flags <link> without &display= parameter', async () => {
    await writeFixture('page.jsx', `
export default function Page() {
  return (
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet" />
    </head>
  );
}
`);
    const result = await auditDirectory(tempDir);
    const missing = result.issues.filter((i) => i.rule === 'audit.missing-font-display');
    expect(missing.length).toBeGreaterThan(0);
  });

  it('extracts font family from <link> href', async () => {
    await writeFixture('app.tsx', `
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
`);
    const result = await auditDirectory(tempDir);
    const font = result.fontsDetected.find((f) => f.family.toLowerCase().includes('playfair'));
    expect(font).toBeDefined();
    expect(font?.source).toBe('google-cdn');
  });
});

describe('HTML scanner: inline font styles', () => {
  it('flags inline font-family styles', async () => {
    await writeFixture('comp.jsx', `
function Comp() {
  return <p style={{ fontFamily: 'Georgia, serif' }}>text</p>;
}
`);
    // Note: JSX style prop uses object notation, the scanner looks for CSS-style string attributes
    // Write as HTML-style attribute to trigger the scanner
    await writeFixture('inline.html', `
<p style="font-family: Georgia, serif; font-size: 14px;">text</p>
`);
    const result = await auditDirectory(tempDir);
    const inlineIssues = result.issues.filter((i) => i.rule === 'audit.inline-font-style');
    expect(inlineIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// package.json scanner
// ---------------------------------------------------------------------------

describe('package.json scanner', () => {
  it('detects Fontsource dependencies', async () => {
    await writeFixture('package.json', JSON.stringify({
      name: 'my-app',
      dependencies: {
        '@fontsource-variable/inter': '^5.0.0',
        '@fontsource/roboto': '^5.0.0',
      },
    }));
    const result = await auditDirectory(tempDir);
    const inter = result.fontsDetected.find((f) => f.family.toLowerCase().includes('inter'));
    expect(inter).toBeDefined();
    expect(inter?.source).toBe('fontsource');
  });

  it('ignores non-font packages', async () => {
    await writeFixture('package.json', JSON.stringify({
      name: 'my-app',
      dependencies: {
        react: '^18.0.0',
        lodash: '^4.17.21',
      },
    }));
    const result = await auditDirectory(tempDir);
    expect(result.fontsDetected).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-reference: no-fallback-metrics
// ---------------------------------------------------------------------------

describe('cross-reference: no-fallback-metrics', () => {
  it('flags google-cdn fonts as lacking fallback metrics', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const noMetrics = result.issues.filter((i) => i.rule === 'audit.no-fallback-metrics');
    expect(noMetrics.length).toBeGreaterThan(0);
    expect(noMetrics[0]!.message).toContain('Inter');
  });
});

// ---------------------------------------------------------------------------
// node_modules exclusion
// ---------------------------------------------------------------------------

describe('directory exclusion', () => {
  it('skips node_modules', async () => {
    await writeFixture('node_modules/some-pkg/styles.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
`);
    const result = await auditDirectory(tempDir);
    // node_modules is skipped — no issues should be found
    expect(result.scanned.totalFiles).toBe(0);
  });

  it('skips .git directory', async () => {
    await writeFixture('.git/hooks/styles.css', `
@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
`);
    const result = await auditDirectory(tempDir);
    expect(result.scanned.totalFiles).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateCorrectedTokens
// ---------------------------------------------------------------------------

describe('generateCorrectedTokens', () => {
  it('returns an object with typography section', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const tokens = generateCorrectedTokens(result);
    expect(tokens).toHaveProperty('typography');
    const t = tokens as Record<string, unknown>;
    expect(t['typography']).toHaveProperty('body');
    expect(t['typography']).toHaveProperty('heading');
  });

  it('uses primary detected font in generated tokens', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Nunito&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const tokens = generateCorrectedTokens(result) as Record<string, Record<string, Record<string, unknown>>>;
    const bodyFamily = tokens['typography']?.['body']?.['fontFamily'];
    expect(Array.isArray(bodyFamily)).toBe(true);
    expect((bodyFamily as string[])[0]).toBe('Nunito');
  });
});

// ---------------------------------------------------------------------------
// formatAuditReport
// ---------------------------------------------------------------------------

describe('formatAuditReport', () => {
  it('returns a string with scanned counts', async () => {
    await writeFixture('styles.css', `body { font-size: 16px; }`);
    const result = await auditDirectory(tempDir);
    const report = formatAuditReport(result);
    expect(typeof report).toBe('string');
    expect(report).toContain('Scanned');
    expect(report).toContain('1 CSS file');
  });

  it('lists fonts detected in report', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const report = formatAuditReport(result);
    expect(report).toContain('Fonts detected');
    expect(report).toContain('Inter');
  });

  it('shows error count in summary', async () => {
    await writeFixture('fonts.css', `
@font-face {
  font-family: 'NoDisplay';
  src: url('/f.woff2') format('woff2');
}
`);
    const result = await auditDirectory(tempDir);
    const report = formatAuditReport(result);
    expect(report).toMatch(/\d+ error/);
  });
});

// ---------------------------------------------------------------------------
// formatAuditMigrationGuide
// ---------------------------------------------------------------------------

describe('formatAuditMigrationGuide', () => {
  it('returns Fontsource install step for google-cdn fonts', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const guide = formatAuditMigrationGuide(result);
    expect(guide.some((s) => s.toLowerCase().includes('fontsource'))).toBe(true);
  });

  it('returns fetchtype init step when fonts are detected', async () => {
    await writeFixture('index.html', `
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
`);
    const result = await auditDirectory(tempDir);
    const guide = formatAuditMigrationGuide(result);
    expect(guide.some((s) => s.includes('fetchtype init'))).toBe(true);
  });

  it('returns empty array for clean project', async () => {
    const result: AuditResult = {
      scanned: { cssFiles: 0, tailwindConfigs: 0, htmlFiles: 0, packageJsons: 0, totalFiles: 0 },
      fontsDetected: [],
      issues: [],
      migrationGuide: [],
    };
    const guide = formatAuditMigrationGuide(result);
    expect(guide).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed issues scenario
// ---------------------------------------------------------------------------

describe('mixed issues scenario', () => {
  it('detects multiple issues across CSS and HTML files', async () => {
    await writeFixture('src/styles.css', `
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900');
@font-face {
  font-family: 'LocalFont';
  src: url('/fonts/local.woff2') format('woff2');
  font-weight: 400;
}
body { line-height: 1.4; color: #999; background: #aaa; }
h1 { line-height: 1.1; }
h2 { line-height: 1.2; }
small { line-height: 2.0; }
`);
    await writeFixture('src/index.html', `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
</head>
</html>`);
    await writeFixture('package.json', JSON.stringify({
      name: 'test',
      dependencies: { '@fontsource/open-sans': '^5.0.0' },
    }));

    const result = await auditDirectory(tempDir);

    // Should have CSS, HTML, package.json files
    expect(result.scanned.cssFiles).toBe(1);
    expect(result.scanned.htmlFiles).toBe(1);
    expect(result.scanned.packageJsons).toBe(1);

    // Should detect multiple fonts
    expect(result.fontsDetected.length).toBeGreaterThan(0);

    // Should detect multiple issue types
    const ruleNames = new Set(result.issues.map((i) => i.rule));
    expect(ruleNames.has('audit.render-blocking')).toBe(true);
    expect(ruleNames.has('audit.google-cdn')).toBe(true);
    expect(ruleNames.has('audit.no-font-display')).toBe(true);

    // Migration guide should be non-empty
    expect(result.migrationGuide.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('throws when directory does not exist', async () => {
    await expect(auditDirectory('/nonexistent/path/xyz')).rejects.toThrow('does not exist');
  });
});
