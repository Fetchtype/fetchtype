import { describe, expect, it } from 'vitest';

import { formatSarifReport, type SarifLog } from './sarif.js';
import type { ValidationReport } from '@fetchtype/types';

const TOKEN_FILE = 'fetchtype.tokens.json';

const EMPTY_REPORT: ValidationReport = {
  diagnostics: [],
  counts: { error: 0, warning: 0, info: 0 },
  pass: true,
};

const REPORT_WITH_DIAGNOSTICS: ValidationReport = {
  diagnostics: [
    {
      rule: 'contrast.text-primary',
      severity: 'error',
      path: 'color.light.text.primary',
      message: 'Contrast ratio is too low',
      actual: '2.5:1',
      expected: '4.5:1',
    },
    {
      rule: 'text-spacing.body-line-height',
      severity: 'warning',
      path: 'typography.body.lineHeight',
      message: 'Body line-height is below minimum',
      actual: '1.2',
      expected: '1.5',
    },
    {
      rule: 'text-spacing.body-line-height',
      severity: 'warning',
      path: 'typography.caption.lineHeight',
      message: 'Caption line-height is below minimum',
    },
    {
      rule: 'font-size-info',
      severity: 'info',
      path: 'typography.label.fontSize',
      message: 'Font size is very small',
    },
  ],
  counts: { error: 1, warning: 2, info: 1 },
  pass: false,
};

describe('formatSarifReport', () => {
  it('produces valid SARIF 2.1.0 structure', () => {
    const sarif: SarifLog = formatSarifReport(EMPTY_REPORT, TOKEN_FILE);

    expect(sarif.$schema).toBe(
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    );
    expect(sarif.version).toBe('2.1.0');
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect(sarif.runs).toHaveLength(1);
  });

  it('populates tool driver correctly', () => {
    const sarif = formatSarifReport(EMPTY_REPORT, TOKEN_FILE);
    const driver = sarif.runs[0]!.tool.driver;

    expect(driver.name).toBe('fetchtype');
    expect(driver.informationUri).toBe('https://fetchtype.com');
    expect(typeof driver.version).toBe('string');
  });

  it('produces 0 results for empty report', () => {
    const sarif = formatSarifReport(EMPTY_REPORT, TOKEN_FILE);

    expect(sarif.runs[0]!.results).toHaveLength(0);
    expect(sarif.runs[0]!.tool.driver.rules).toHaveLength(0);
  });

  it('maps error severity to SARIF error level', () => {
    const report: ValidationReport = {
      diagnostics: [
        { rule: 'some.rule', severity: 'error', path: 'a.b', message: 'Error message' },
      ],
      counts: { error: 1, warning: 0, info: 0 },
      pass: false,
    };
    const sarif = formatSarifReport(report, TOKEN_FILE);

    expect(sarif.runs[0]!.results[0]!.level).toBe('error');
  });

  it('maps warning severity to SARIF warning level', () => {
    const report: ValidationReport = {
      diagnostics: [
        { rule: 'some.rule', severity: 'warning', path: 'a.b', message: 'Warning message' },
      ],
      counts: { error: 0, warning: 1, info: 0 },
      pass: true,
    };
    const sarif = formatSarifReport(report, TOKEN_FILE);

    expect(sarif.runs[0]!.results[0]!.level).toBe('warning');
  });

  it('maps info severity to SARIF note level', () => {
    const report: ValidationReport = {
      diagnostics: [
        { rule: 'some.rule', severity: 'info', path: 'a.b', message: 'Info message' },
      ],
      counts: { error: 0, warning: 0, info: 1 },
      pass: true,
    };
    const sarif = formatSarifReport(report, TOKEN_FILE);

    expect(sarif.runs[0]!.results[0]!.level).toBe('note');
  });

  it('deduplicates rules with the same ruleId', () => {
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, TOKEN_FILE);
    const ruleIds = sarif.runs[0]!.tool.driver.rules.map((r) => r.id);

    // text-spacing.body-line-height appears twice in diagnostics but should be one rule
    const unique = new Set(ruleIds);
    expect(ruleIds).toHaveLength(unique.size);
    expect(ruleIds).toContain('contrast.text-primary');
    expect(ruleIds).toContain('text-spacing.body-line-height');
    expect(ruleIds).toContain('font-size-info');
    expect(ruleIds).toHaveLength(3);
  });

  it('creates one result per diagnostic (no deduplication of results)', () => {
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, TOKEN_FILE);

    expect(sarif.runs[0]!.results).toHaveLength(4);
  });

  it('includes the token file path in artifact locations', () => {
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, TOKEN_FILE);

    for (const result of sarif.runs[0]!.results) {
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0]!.physicalLocation.artifactLocation.uri).toBe(TOKEN_FILE);
    }
  });

  it('includes path, actual, and expected in message text when present', () => {
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, TOKEN_FILE);
    // First diagnostic has path, actual, expected
    const firstResult = sarif.runs[0]!.results[0]!;

    expect(firstResult.message.text).toContain('Contrast ratio is too low');
    expect(firstResult.message.text).toContain('path: color.light.text.primary');
    expect(firstResult.message.text).toContain('actual: 2.5:1');
    expect(firstResult.message.text).toContain('expected: 4.5:1');
  });

  it('omits optional fields from message when not present', () => {
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, TOKEN_FILE);
    // Fourth diagnostic (font-size-info) has only rule/severity/path/message
    const fourthResult = sarif.runs[0]!.results[3]!;

    expect(fourthResult.message.text).not.toContain('actual:');
    expect(fourthResult.message.text).not.toContain('expected:');
  });

  it('accepts a custom file path and uses it in results', () => {
    const customPath = 'design/tokens/base.json';
    const sarif = formatSarifReport(REPORT_WITH_DIAGNOSTICS, customPath);

    for (const result of sarif.runs[0]!.results) {
      expect(result.locations[0]!.physicalLocation.artifactLocation.uri).toBe(customPath);
    }
  });
});
