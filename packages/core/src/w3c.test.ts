import { describe, expect, it } from 'vitest';

import { DEFAULT_TOKEN_SET } from './presets.js';
import { exportW3cTokens, importW3cTokens } from './w3c.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedValue(root: unknown, path: string[]): unknown {
  let current = root;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

describe('exportW3cTokens', () => {
  it('produces $type and $value for color tokens', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const primary = getNestedValue(w3c, ['color', 'light', 'text', 'primary']);

    expect(primary).toEqual({
      $type: 'color',
      $value: expect.any(String),
    });
  });

  it('produces $type and $value for typography tokens', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const body = getNestedValue(w3c, ['typography', 'body']) as Record<string, unknown>;

    expect(body.$type).toBe('typography');
    expect(isRecord(body.$value)).toBe(true);
    const val = body.$value as Record<string, unknown>;
    expect(val.fontFamily).toBeDefined();
    expect(val.fontSize).toBeDefined();
  });

  it('produces $type and $value for spacing tokens', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const sm = getNestedValue(w3c, ['spacing', 'sm']) as Record<string, unknown>;

    expect(sm.$type).toBe('dimension');
    expect(sm.$value).toBe('0.5rem');
  });

  it('produces $type and $value for layout maxWidth tokens', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const prose = getNestedValue(w3c, ['layout', 'maxWidth', 'prose']) as Record<string, unknown>;

    expect(prose.$type).toBe('dimension');
    expect(prose.$value).toBe('68ch');
  });

  it('produces $type and $value for hierarchy heading tokens', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const h1 = getNestedValue(w3c, ['hierarchy', 'headings', 'h1']) as Record<string, unknown>;

    expect(h1.$type).toBe('typography');
    expect(isRecord(h1.$value)).toBe(true);
  });

  it('stores themes in $extensions', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const extensions = w3c['$extensions'] as Record<string, unknown>;

    expect(extensions).toBeDefined();
    expect(Array.isArray(extensions['com.fetchtype.themes'])).toBe(true);
  });

  it('stores modes in $extensions', () => {
    const w3c = exportW3cTokens(DEFAULT_TOKEN_SET);
    const extensions = w3c['$extensions'] as Record<string, unknown>;

    expect(extensions).toBeDefined();
    expect(isRecord(extensions['com.fetchtype.modes'])).toBe(true);
  });
});

describe('importW3cTokens', () => {
  it('imports a minimal W3C document (just colors) and produces a valid DesignTokenSet', () => {
    const minimal = {
      color: {
        text: {
          primary: { $type: 'color', $value: '#000000' },
        },
      },
    };

    const result = importW3cTokens(minimal);

    // Should have filled defaults for everything else
    expect(result.typography.body).toBeDefined();
    expect(result.spacing.scale).toBeDefined();
    expect(result.hierarchy.headings.h1).toBeDefined();
    // The color we specified should be applied
    expect(result.color.light.text.primary.value).toBe('#000000');
  });

  it('fills defaults for missing sections', () => {
    const result = importW3cTokens({});

    expect(result.typography.body).toBeDefined();
    expect(result.color.light.text.primary.value).toBe(
      DEFAULT_TOKEN_SET.color.light.text.primary.value,
    );
    expect(result.spacing.unit).toBe(DEFAULT_TOKEN_SET.spacing.unit);
  });

  it('imports typography tokens', () => {
    const doc = {
      typography: {
        body: {
          $type: 'typography',
          $value: {
            fontFamily: 'Georgia, serif',
            fontSize: '1.125rem',
            fontWeight: 400,
            lineHeight: 1.8,
          },
        },
      },
    };

    const result = importW3cTokens(doc);

    expect(result.typography.body!.fontFamily).toBe('Georgia, serif');
    expect(result.typography.body!.fontSize).toBe('1.125rem');
    expect(result.typography.body!.lineHeight).toBe(1.8);
  });

  it('imports dimension tokens into spacing', () => {
    const doc = {
      spacing: {
        sm: { $type: 'dimension', $value: '0.25rem' },
        md: { $type: 'dimension', $value: '0.75rem' },
      },
    };

    const result = importW3cTokens(doc);

    expect(result.spacing.scale.sm).toBe('0.25rem');
    expect(result.spacing.scale.md).toBe('0.75rem');
  });

  it('restores themes from $extensions', () => {
    const themes = [
      {
        name: 'brand-test',
        colorScheme: 'brand',
        tokens: {
          'color.light.interactive.default.value': '#ff0000',
        },
      },
    ];

    const doc = {
      $extensions: {
        'com.fetchtype.themes': themes,
      },
    };

    const result = importW3cTokens(doc);

    expect(result.themes).toHaveLength(1);
    expect(result.themes[0]!.name).toBe('brand-test');
  });

  it('restores modes from $extensions', () => {
    const modes = {
      compact: {
        name: 'compact',
        tokens: {
          'typography.body.lineHeight': 1.4,
        },
      },
    };

    const doc = {
      $extensions: {
        'com.fetchtype.modes': modes,
      },
    };

    const result = importW3cTokens(doc);

    expect(result.modes['compact']).toBeDefined();
    expect(result.modes['compact']!.name).toBe('compact');
  });
});

describe('roundtrip', () => {
  it('export then import preserves color values', () => {
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    expect(imported.color.light.text.primary.value).toBe(
      DEFAULT_TOKEN_SET.color.light.text.primary.value,
    );
    expect(imported.color.dark.background.primary.value).toBe(
      DEFAULT_TOKEN_SET.color.dark.background.primary.value,
    );
  });

  it('export then import preserves typography values', () => {
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    expect(imported.typography.body!.fontSize).toBe(DEFAULT_TOKEN_SET.typography.body!.fontSize);
    expect(imported.typography.body!.fontWeight).toBe(DEFAULT_TOKEN_SET.typography.body!.fontWeight);
  });

  it('export then import preserves spacing values', () => {
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    expect(imported.spacing.scale.sm).toBe(DEFAULT_TOKEN_SET.spacing.scale.sm);
    expect(imported.spacing.scale.xl).toBe(DEFAULT_TOKEN_SET.spacing.scale.xl);
  });

  it('preserves alias references through roundtrip', () => {
    // The base token set has alias references like
    // color.light.text.accent.value = "{color.light.interactive.default.value}"
    // After export, these become resolved values. The roundtrip preserves the resolved value.
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    // The accent color should match the interactive default (resolved)
    expect(imported.color.light.text.accent.value).toBe(
      DEFAULT_TOKEN_SET.color.light.text.accent.value,
    );
  });

  it('preserves themes through roundtrip', () => {
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    expect(imported.themes).toHaveLength(DEFAULT_TOKEN_SET.themes.length);
    if (DEFAULT_TOKEN_SET.themes.length > 0) {
      expect(imported.themes[0]!.name).toBe(DEFAULT_TOKEN_SET.themes[0]!.name);
    }
  });

  it('preserves modes through roundtrip', () => {
    const exported = exportW3cTokens(DEFAULT_TOKEN_SET);
    const imported = importW3cTokens(exported);

    const originalModeNames = Object.keys(DEFAULT_TOKEN_SET.modes);
    const importedModeNames = Object.keys(imported.modes);

    expect(importedModeNames).toEqual(originalModeNames);
  });
});
