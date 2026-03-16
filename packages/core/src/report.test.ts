import { describe, expect, it } from 'vitest';

import {
  buildTokenArtifacts,
  DEFAULT_TOKEN_SET,
  generateCssVariables,
  generateHtmlReport,
} from './index.js';

import type { ValidationReport } from '@fetchtype/types';

function buildReport(): { html: string; report: ValidationReport } {
  const artifacts = buildTokenArtifacts(DEFAULT_TOKEN_SET);
  const html = generateHtmlReport(artifacts.tokenSet, artifacts.report, artifacts.css);
  return { html, report: artifacts.report };
}

describe('generateHtmlReport', () => {
  it('contains heading specimens for h1 through h6', () => {
    const { html } = buildReport();

    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');
    expect(html).toContain('<h4');
    expect(html).toContain('<h5');
    expect(html).toContain('<h6');
    expect(html).toContain('Heading Hierarchy');
  });

  it('contains body text specimen', () => {
    const { html } = buildReport();

    expect(html).toContain('Body Text');
    expect(html).toContain('quick brown fox');
  });

  it('contains button specimen', () => {
    const { html } = buildReport();

    expect(html).toContain('Button Specimen');
    expect(html).toContain('<button');
    expect(html).toContain('Button Label');
  });

  it('contains color swatches for light and dark modes', () => {
    const { html } = buildReport();

    expect(html).toContain('Light Mode');
    expect(html).toContain('Dark Mode');
    expect(html).toContain('Color Palette');
    // Should contain hex values from the token set
    expect(html).toContain('#111827');
    expect(html).toContain('#f9fafb');
  });

  it('includes contrast ratios in color swatches', () => {
    const { html } = buildReport();

    // Contrast ratios are displayed as "N.NN:1"
    expect(html).toMatch(/\d+\.\d+:1/);
  });

  it('includes spacing scale visualization', () => {
    const { html } = buildReport();

    expect(html).toContain('Spacing Scale');
    expect(html).toContain('0.25rem');
    expect(html).toContain('xs');
    expect(html).toContain('3xl');
  });

  it('includes validation diagnostics section', () => {
    const { html } = buildReport();

    // Default token set passes validation
    expect(html).toContain('Validation Results');
    expect(html).toContain('Passed');
  });

  it('shows diagnostics table when there are issues', () => {
    const degraded = structuredClone(DEFAULT_TOKEN_SET);
    degraded.color.light.text.primary.value = '#9ca3af';

    const css = generateCssVariables(degraded);
    const report: ValidationReport = {
      diagnostics: [
        {
          rule: 'contrast.text-primary.light',
          severity: 'error',
          path: 'color.light.text.primary',
          message: 'Primary light-mode text does not meet minimum contrast.',
          expected: '>= 4.5:1',
          actual: '2.5:1',
        },
      ],
      counts: { error: 1, warning: 0, info: 0 },
      pass: false,
    };

    const html = generateHtmlReport(degraded, report, css);

    expect(html).toContain('contrast.text-primary.light');
    expect(html).toContain('color.light.text.primary');
    expect(html).toContain('Failed');
  });

  it('generates mode switcher buttons when modes exist', () => {
    const { html } = buildReport();

    // Default token set has modes: display, interface, reading, mono
    expect(html).toContain('Modes');
    expect(html).toContain('data-mode="display"');
    expect(html).toContain('data-mode="interface"');
    expect(html).toContain('data-mode="reading"');
    expect(html).toContain('data-mode="mono"');
  });

  it('omits mode switcher when no modes exist', () => {
    const noModes = structuredClone(DEFAULT_TOKEN_SET);
    noModes.modes = {};

    const css = generateCssVariables(noModes);
    const report: ValidationReport = {
      diagnostics: [],
      counts: { error: 0, warning: 0, info: 0 },
      pass: true,
    };

    const html = generateHtmlReport(noModes, report, css);

    expect(html).not.toContain('data-mode=');
    expect(html).not.toContain('>Modes<');
  });

  it('produces a fully self-contained HTML document', () => {
    const { html } = buildReport();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<style>');
    // Should not reference external resources
    expect(html).not.toContain('<link');
    expect(html).not.toContain('<script src=');
  });

  it('includes the generated CSS variables inline', () => {
    const { html } = buildReport();

    expect(html).toContain('--ft-typography');
    expect(html).toContain(':root {');
  });
});
