import type { DesignTokenSet, ValidationReport } from '@fetchtype/types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFontFamily(fontFamily: string | string[]): string {
  return Array.isArray(fontFamily) ? fontFamily.join(', ') : fontFamily;
}

function severityBadge(severity: string): string {
  const colors: Record<string, string> = {
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
  };
  const color = colors[severity] ?? '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color};color:#fff;font-size:0.75rem;font-weight:600;text-transform:uppercase;">${escapeHtml(severity)}</span>`;
}

function contrastRatio(fg: string, bg: string): string {
  const parse = (hex: string): [number, number, number] | null => {
    const m = hex.trim().match(/^#(?:([0-9a-fA-F]{3})|([0-9a-fA-F]{6}))$/);
    if (!m) return null;
    const h = m[1]
      ? m[1].split('').map((c) => `${c}${c}`).join('')
      : m[2]!;
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  };

  const luminance = ([r, g, b]: [number, number, number]): number => {
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const fgRgb = parse(fg);
  const bgRgb = parse(bg);
  if (!fgRgb || !bgRgb) return 'N/A';

  const l1 = luminance(fgRgb);
  const l2 = luminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

function renderColorSwatch(
  label: string,
  value: string,
  bgColor: string,
): string {
  const ratio = contrastRatio(value, bgColor);
  return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
    <div style="width:32px;height:32px;border-radius:4px;background:${escapeHtml(value)};border:1px solid #d1d5db;flex-shrink:0;"></div>
    <div style="font-size:0.8125rem;">
      <strong>${escapeHtml(label)}</strong><br>
      <code>${escapeHtml(value)}</code>
      <span style="color:#6b7280;margin-left:4px;">${ratio}:1</span>
    </div>
  </div>`;
}

function renderColorGroup(
  groupName: string,
  group: Record<string, { value: string }>,
  bgColor: string,
): string {
  const swatches = Object.entries(group)
    .map(([name, token]) => renderColorSwatch(name, token.value, bgColor))
    .join('\n');
  return `<div style="margin-bottom:16px;">
    <h4 style="font-family:system-ui,sans-serif;font-size:0.875rem;font-weight:600;margin:0 0 8px 0;text-transform:capitalize;">${escapeHtml(groupName)}</h4>
    ${swatches}
  </div>`;
}

function renderColorPalette(tokenSet: DesignTokenSet): string {
  const lightBg = tokenSet.color.light.background.primary.value;
  const darkBg = tokenSet.color.dark.background.primary.value;

  const lightGroups = Object.entries(tokenSet.color.light)
    .map(([name, group]) => renderColorGroup(name, group, lightBg))
    .join('\n');

  const darkGroups = Object.entries(tokenSet.color.dark)
    .map(([name, group]) => renderColorGroup(name, group, darkBg))
    .join('\n');

  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Color Palette</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div style="padding:16px;border-radius:8px;background:${escapeHtml(lightBg)};border:1px solid #e5e7eb;">
        <h3 style="font-family:system-ui,sans-serif;font-size:1rem;font-weight:600;margin:0 0 12px 0;color:${escapeHtml(tokenSet.color.light.text.primary.value)};">Light Mode</h3>
        ${lightGroups}
      </div>
      <div style="padding:16px;border-radius:8px;background:${escapeHtml(darkBg)};border:1px solid #334155;">
        <h3 style="font-family:system-ui,sans-serif;font-size:1rem;font-weight:600;margin:0 0 12px 0;color:${escapeHtml(tokenSet.color.dark.text.primary.value)};">Dark Mode</h3>
        ${darkGroups}
      </div>
    </div>
  </section>`;
}

function renderHeadingSpecimens(tokenSet: DesignTokenSet): string {
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const specimens = levels.map((level) => {
    const token = tokenSet.hierarchy.headings[level];
    const family = token.fontFamily ? formatFontFamily(token.fontFamily) : 'inherit';
    return `<${level} style="font-family:${escapeHtml(family)};font-size:${escapeHtml(String(token.fontSize))};font-weight:${token.fontWeight};line-height:${token.lineHeight};margin:8px 0;">${level.toUpperCase()} — ${escapeHtml(String(token.fontSize))} / ${token.fontWeight} / ${token.lineHeight}</${level}>`;
  });

  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Heading Hierarchy</h2>
    ${specimens.join('\n')}
  </section>`;
}

function renderBodySpecimen(tokenSet: DesignTokenSet): string {
  const body = tokenSet.typography.body;
  if (!body) return '';

  const family = formatFontFamily(body.fontFamily);
  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Body Text</h2>
    <p style="font-family:${escapeHtml(family)};font-size:${escapeHtml(body.fontSize)};font-weight:${body.fontWeight};line-height:${body.lineHeight};max-width:68ch;margin:0;">
      The quick brown fox jumps over the lazy dog. Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. Good typography establishes a strong visual hierarchy, provides graphic balance, and sets the overall tone of the product.
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:0.75rem;color:#6b7280;margin:8px 0 0 0;">
      ${escapeHtml(family)} &middot; ${escapeHtml(body.fontSize)} &middot; weight ${body.fontWeight} &middot; line-height ${body.lineHeight}
    </p>
  </section>`;
}

function renderButtonSpecimen(tokenSet: DesignTokenSet): string {
  const btn = tokenSet.typography.button;
  if (!btn) return '';

  const family = formatFontFamily(btn.fontFamily);
  const interactive = tokenSet.color.light.interactive;
  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Button Specimen</h2>
    <button style="font-family:${escapeHtml(family)};font-size:${escapeHtml(btn.fontSize)};font-weight:${btn.fontWeight};line-height:${btn.lineHeight};${btn.letterSpacing ? `letter-spacing:${escapeHtml(btn.letterSpacing)};` : ''}${btn.textTransform ? `text-transform:${escapeHtml(btn.textTransform)};` : ''}background:${escapeHtml(interactive.default.value)};color:#fff;border:none;border-radius:6px;padding:10px 20px;cursor:pointer;">
      Button Label
    </button>
    <p style="font-family:system-ui,sans-serif;font-size:0.75rem;color:#6b7280;margin:8px 0 0 0;">
      ${escapeHtml(family)} &middot; ${escapeHtml(btn.fontSize)} &middot; weight ${btn.fontWeight}
    </p>
  </section>`;
}

function renderSpacingScale(tokenSet: DesignTokenSet): string {
  const entries = Object.entries(tokenSet.spacing.scale);
  const blocks = entries.map(
    ([name, value]) =>
      `<div style="display:flex;align-items:center;gap:12px;margin:4px 0;">
        <div style="width:${escapeHtml(value)};height:24px;background:#3b82f6;border-radius:3px;flex-shrink:0;"></div>
        <span style="font-family:system-ui,sans-serif;font-size:0.8125rem;"><strong>${escapeHtml(name)}</strong> &mdash; ${escapeHtml(value)}</span>
      </div>`,
  );

  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Spacing Scale</h2>
    <p style="font-family:system-ui,sans-serif;font-size:0.8125rem;color:#6b7280;margin:0 0 12px 0;">Base unit: ${escapeHtml(tokenSet.spacing.unit)}</p>
    ${blocks.join('\n')}
  </section>`;
}

function renderDiagnostics(report: ValidationReport): string {
  if (report.diagnostics.length === 0) {
    return `<section style="margin-bottom:32px;">
      <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Validation Results</h2>
      <p style="font-family:system-ui,sans-serif;font-size:0.875rem;color:#16a34a;">All checks passed. No diagnostics.</p>
    </section>`;
  }

  const rows = report.diagnostics
    .map(
      (d) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${severityBadge(d.severity)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:ui-monospace,monospace;font-size:0.8125rem;">${escapeHtml(d.rule)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:ui-monospace,monospace;font-size:0.8125rem;">${escapeHtml(d.path)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:0.8125rem;">${escapeHtml(d.message)}</td>
        </tr>`,
    )
    .join('\n');

  const statusColor = report.pass ? '#16a34a' : '#dc2626';
  const statusText = report.pass ? 'Passed' : 'Failed';

  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Validation Results</h2>
    <p style="font-family:system-ui,sans-serif;font-size:0.875rem;margin:0 0 12px 0;">
      Status: <strong style="color:${statusColor};">${statusText}</strong>
      &mdash; ${report.counts.error} errors, ${report.counts.warning} warnings, ${report.counts.info} info
    </p>
    <table style="width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:0.8125rem;">Severity</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:0.8125rem;">Rule</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:0.8125rem;">Path</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:0.8125rem;">Message</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>`;
}

function renderModeSwitcher(tokenSet: DesignTokenSet): string {
  const modeNames = Object.keys(tokenSet.modes);
  if (modeNames.length === 0) return '';

  const buttons = modeNames
    .map(
      (name) =>
        `<button data-mode="${escapeHtml(name)}" style="font-family:system-ui,sans-serif;font-size:0.8125rem;padding:6px 14px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;margin:0 4px 4px 0;">${escapeHtml(name)}</button>`,
    )
    .join('\n');

  return `<section style="margin-bottom:32px;">
    <h2 style="font-family:system-ui,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 16px 0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Modes</h2>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">
      ${buttons}
    </div>
  </section>`;
}

export function generateHtmlReport(
  tokenSet: DesignTokenSet,
  report: ValidationReport,
  css: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fetchtype Token Report</title>
  <style>
${css}

/* Report UI styles */
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 24px;
  background: #fff;
  color: #111827;
  line-height: 1.5;
}
.report-container {
  max-width: 960px;
  margin: 0 auto;
}
  </style>
</head>
<body>
  <div class="report-container">
    <header style="margin-bottom:32px;">
      <h1 style="font-family:system-ui,sans-serif;font-size:1.75rem;font-weight:800;margin:0 0 4px 0;">Fetchtype Token Report</h1>
      <p style="font-family:system-ui,sans-serif;font-size:0.875rem;color:#6b7280;margin:0;">Generated ${escapeHtml(new Date().toISOString().split('T')[0]!)}</p>
    </header>

    ${renderHeadingSpecimens(tokenSet)}
    ${renderBodySpecimen(tokenSet)}
    ${renderButtonSpecimen(tokenSet)}
    ${renderColorPalette(tokenSet)}
    ${renderSpacingScale(tokenSet)}
    ${renderModeSwitcher(tokenSet)}
    ${renderDiagnostics(report)}
  </div>
</body>
</html>`;
}
