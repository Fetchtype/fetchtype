import { DesignTokenSetSchema, type DesignTokenSet } from '@fetchtype/types';

import { DEFAULT_TOKEN_SET } from './presets.js';

type W3cToken = {
  $type?: string;
  $value?: unknown;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Helpers: flatten / unflatten nested objects with dot-path keys
// ---------------------------------------------------------------------------

function flattenW3c(
  node: Record<string, unknown>,
  prefix: string,
  result: Map<string, W3cToken>,
  inheritedType?: string,
): void {
  const nodeType = (node['$type'] as string | undefined) ?? inheritedType;

  if (node['$value'] !== undefined) {
    result.set(prefix, {
      $type: nodeType,
      $value: node['$value'],
      ...(node['$description'] ? { $description: node['$description'] as string } : {}),
    });
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue;
    }

    if (isRecord(value)) {
      flattenW3c(value, prefix ? `${prefix}.${key}` : key, result, nodeType);
    }
  }
}

function setNestedValue(root: Record<string, unknown>, path: string[], value: unknown): void {
  let current = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i]!;
    if (!isRecord(current[segment])) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[path[path.length - 1]!] = value;
}

// ---------------------------------------------------------------------------
// Import: W3C → fetchtype
// ---------------------------------------------------------------------------

export function importW3cTokens(w3cDocument: unknown): DesignTokenSet {
  if (!isRecord(w3cDocument)) {
    throw new Error('W3C token document must be a JSON object.');
  }

  const flat = new Map<string, W3cToken>();
  flattenW3c(w3cDocument, '', flat);

  // Start with a deep clone of DEFAULT_TOKEN_SET so every required field exists
  const base = structuredClone(DEFAULT_TOKEN_SET);

  // Merge discovered tokens into the base
  for (const [path, token] of flat) {
    const segments = path.split('.');
    const type = token.$type;
    const value = token.$value;

    if (type === 'color') {
      applyColorToken(base, segments, value);
    } else if (type === 'typography') {
      applyTypographyToken(base, segments, value);
    } else if (type === 'dimension') {
      applyDimensionToken(base, segments, value);
    } else if (type === 'fontFamily') {
      applyFontFamilyToken(base, segments, value);
    }
  }

  // Restore themes/modes from $extensions if present
  const extensions = (w3cDocument as Record<string, unknown>)['$extensions'];
  if (isRecord(extensions)) {
    const themes = extensions['com.fetchtype.themes'];
    if (Array.isArray(themes)) {
      base.themes = themes as DesignTokenSet['themes'];
    }
    const modes = extensions['com.fetchtype.modes'];
    if (isRecord(modes)) {
      base.modes = modes as DesignTokenSet['modes'];
    }
  }

  return DesignTokenSetSchema.parse(base);
}

function applyColorToken(
  base: DesignTokenSet,
  segments: string[],
  value: unknown,
): void {
  // Expected paths: color.{dark.}?{group}.{name}
  if (segments[0] !== 'color' || segments.length < 3) {
    return;
  }

  let mode: 'light' | 'dark' = 'light';
  let groupStart = 1;

  if (segments[1] === 'dark') {
    mode = 'dark';
    groupStart = 2;
  } else if (segments[1] === 'light') {
    groupStart = 2;
  }

  const groupName = segments[groupStart];
  const tokenName = segments[groupStart + 1];

  if (!groupName || !tokenName) {
    return;
  }

  const group = (base.color[mode] as Record<string, Record<string, { value: string }>>)[groupName];
  if (group && tokenName in group) {
    group[tokenName] = { value: String(value) };
  }
}

function applyTypographyToken(
  base: DesignTokenSet,
  segments: string[],
  value: unknown,
): void {
  // Expected path: typography.{context}
  if (segments[0] !== 'typography' || segments.length < 2) {
    return;
  }

  const context = segments[1]!;
  if (!isRecord(value)) {
    return;
  }

  const token: Record<string, unknown> = {};
  if (value['fontFamily'] !== undefined) {
    token['fontFamily'] = value['fontFamily'];
  }
  if (value['fontSize'] !== undefined) {
    token['fontSize'] = String(value['fontSize']);
  }
  if (value['fontWeight'] !== undefined) {
    token['fontWeight'] = value['fontWeight'];
  }
  if (value['lineHeight'] !== undefined) {
    token['lineHeight'] = value['lineHeight'];
  }
  if (value['letterSpacing'] !== undefined) {
    token['letterSpacing'] = String(value['letterSpacing']);
  }
  if (value['textTransform'] !== undefined) {
    token['textTransform'] = value['textTransform'];
  }
  if (value['textDecoration'] !== undefined) {
    token['textDecoration'] = value['textDecoration'];
  }

  // Only apply if we have at least fontFamily, fontSize, fontWeight, lineHeight
  if (
    token['fontFamily'] !== undefined &&
    token['fontSize'] !== undefined &&
    token['fontWeight'] !== undefined &&
    token['lineHeight'] !== undefined
  ) {
    (base.typography as Record<string, unknown>)[context] = token;
  }
}

function applyDimensionToken(
  base: DesignTokenSet,
  segments: string[],
  value: unknown,
): void {
  if (segments.length < 2) {
    return;
  }

  const section = segments[0];
  const name = segments[segments.length - 1]!;

  if (section === 'spacing') {
    // spacing.{name}
    base.spacing.scale[name] = String(value);
  } else if (section === 'layout') {
    if (segments[1] === 'maxWidth' && segments[2]) {
      const key = segments[2] as keyof typeof base.layout.maxWidth;
      if (key in base.layout.maxWidth) {
        base.layout.maxWidth[key] = String(value);
      }
    } else if (segments[1] === 'breakpoints' && segments[2]) {
      base.layout.breakpoints[segments[2]] = String(value);
    }
  }
}

function applyFontFamilyToken(
  _base: DesignTokenSet,
  _segments: string[],
  _value: unknown,
): void {
  // fontFamily tokens are informational; they typically get consumed
  // through typography tokens that reference them. No direct mapping needed.
}

// ---------------------------------------------------------------------------
// Export: fetchtype → W3C
// ---------------------------------------------------------------------------

export function exportW3cTokens(tokenSet: DesignTokenSet): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  // -- Colors --
  for (const mode of ['light', 'dark'] as const) {
    const colorMode = tokenSet.color[mode];
    for (const [groupName, group] of Object.entries(colorMode)) {
      for (const [tokenName, tokenValue] of Object.entries(
        group as Record<string, { value: string; description?: string }>,
      )) {
        const w3cToken: Record<string, unknown> = {
          $type: 'color',
          $value: tokenValue.value,
        };
        if (tokenValue.description) {
          w3cToken['$description'] = tokenValue.description;
        }
        setNestedValue(root, ['color', mode, groupName, tokenName], w3cToken);
      }
    }
  }

  // -- Typography --
  for (const [context, token] of Object.entries(tokenSet.typography)) {
    const typValue: Record<string, unknown> = {
      fontFamily: token.fontFamily,
      fontSize: token.fontSize,
      fontWeight: token.fontWeight,
      lineHeight: token.lineHeight,
    };
    if (token.letterSpacing) {
      typValue['letterSpacing'] = token.letterSpacing;
    }
    if (token.textTransform) {
      typValue['textTransform'] = token.textTransform;
    }
    if (token.textDecoration) {
      typValue['textDecoration'] = token.textDecoration;
    }
    setNestedValue(root, ['typography', context], {
      $type: 'typography',
      $value: typValue,
    });
  }

  // -- Spacing --
  setNestedValue(root, ['spacing', 'unit'], {
    $type: 'dimension',
    $value: tokenSet.spacing.unit,
  });
  for (const [name, value] of Object.entries(tokenSet.spacing.scale)) {
    setNestedValue(root, ['spacing', name], {
      $type: 'dimension',
      $value: value,
    });
  }

  // -- Layout --
  for (const [name, value] of Object.entries(tokenSet.layout.maxWidth)) {
    setNestedValue(root, ['layout', 'maxWidth', name], {
      $type: 'dimension',
      $value: value,
    });
  }
  for (const [name, value] of Object.entries(tokenSet.layout.breakpoints)) {
    setNestedValue(root, ['layout', 'breakpoints', name], {
      $type: 'dimension',
      $value: value,
    });
  }
  if (tokenSet.layout.grid) {
    setNestedValue(root, ['layout', 'grid', 'columns'], {
      $type: 'number',
      $value: tokenSet.layout.grid.columns,
    });
    setNestedValue(root, ['layout', 'grid', 'gap'], {
      $type: 'dimension',
      $value: tokenSet.layout.grid.gap,
    });
  }

  // -- Hierarchy --
  setNestedValue(root, ['hierarchy', 'scale'], {
    $type: 'string',
    $value: tokenSet.hierarchy.scale,
  });
  setNestedValue(root, ['hierarchy', 'baseSize'], {
    $type: 'dimension',
    $value: tokenSet.hierarchy.baseSize,
  });
  for (const [level, heading] of Object.entries(tokenSet.hierarchy.headings)) {
    const headingValue: Record<string, unknown> = {
      fontSize: heading.fontSize,
      fontWeight: heading.fontWeight,
      lineHeight: heading.lineHeight,
    };
    if (heading.letterSpacing) {
      headingValue['letterSpacing'] = heading.letterSpacing;
    }
    if (heading.fontFamily) {
      headingValue['fontFamily'] = heading.fontFamily;
    }
    setNestedValue(root, ['hierarchy', 'headings', level], {
      $type: 'typography',
      $value: headingValue,
    });
  }

  // -- Emphasis --
  setNestedValue(root, ['hierarchy', 'emphasis', 'strong'], {
    $type: 'typography',
    $value: { fontWeight: tokenSet.hierarchy.emphasis.strong.fontWeight },
  });
  setNestedValue(root, ['hierarchy', 'emphasis', 'subtle'], {
    $type: 'typography',
    $value: {
      opacity: tokenSet.hierarchy.emphasis.subtle.opacity,
      ...(tokenSet.hierarchy.emphasis.subtle.fontSize
        ? { fontSize: tokenSet.hierarchy.emphasis.subtle.fontSize }
        : {}),
    },
  });

  // -- Themes & modes in $extensions --
  const extensions: Record<string, unknown> = {};
  if (tokenSet.themes.length > 0) {
    extensions['com.fetchtype.themes'] = tokenSet.themes;
  }
  if (Object.keys(tokenSet.modes).length > 0) {
    extensions['com.fetchtype.modes'] = tokenSet.modes;
  }
  if (Object.keys(extensions).length > 0) {
    root['$extensions'] = extensions;
  }

  return root;
}
