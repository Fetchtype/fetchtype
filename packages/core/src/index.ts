import {
  DesignTokenSetSchema,
  type DesignTokenSet,
  type Diagnostic,
  type ModeOverride,
  type ThemeMode,
  type ValidationReport,
} from '@fetchtype/types';

import type { Severity } from '@fetchtype/types';

import { lookupFont, resolveFont, SYSTEM_FONT_STACKS } from '@fetchtype/fonts';

import { DEFAULT_TOKEN_SET, getPreset, PRESET_NAMES, PRESETS } from './presets.js';
import { computeHeadingSizes, SCALE_RATIOS } from './scale.js';
import {
  evaluateTypographyReferences,
  findBestTypographyReferences,
} from './systems.js';

export type BuildOptions = {
  prefix?: string;
  minBodyLineHeight?: number;
  minButtonSizePx?: number;
  maxProseWidthCh?: number;
  referenceSystems?: string[];
};

export type ValidationConfig = {
  rules: Record<
    string,
    false | Severity | { severity: Severity; options?: Record<string, unknown> }
  >;
  fonts?: {
    allow?: string[];
    block?: Array<string | { family: string; reason: string }>;
  };
  performance?: {
    maxFontPayloadKb?: number;
    maxFontCount?: number;
    maxPreloadCount?: number;
  };
  requiredSubsets?: string[];
};

export type BuildArtifacts = {
  tokenSet: DesignTokenSet;
  report: ValidationReport;
  css: string;
  json: string;
};

const DEFAULT_OPTIONS: Required<BuildOptions> = {
  prefix: 'ft',
  minBodyLineHeight: 1.5,
  minButtonSizePx: 14,
  maxProseWidthCh: 75,
  referenceSystems: [],
};

type ParsedValue = {
  value: number;
  unit: string | null;
};

const TOKEN_REFERENCE_PATTERN = /^\{([A-Za-z0-9_.-]+)\}$/;

function createDiagnostic(
  rule: string,
  severity: Diagnostic['severity'],
  path: string,
  message: string,
  expected?: string,
  actual?: string,
): Diagnostic {
  return {
    rule,
    severity,
    path,
    message,
    expected,
    actual,
  };
}

function getRuleSeverity(
  rule: string,
  config?: ValidationConfig,
): Diagnostic['severity'] | false | undefined {
  if (!config?.rules) return undefined; // use default
  if (!(rule in config.rules)) return undefined; // use default
  const ruleConfig = config.rules[rule];
  if (ruleConfig === false) return false; // disabled
  if (typeof ruleConfig === 'string') return ruleConfig; // severity override
  if (typeof ruleConfig === 'object') return ruleConfig.severity;
  return undefined; // use default
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseReferencePath(value: string): string[] | null {
  const match = value.match(TOKEN_REFERENCE_PATTERN);
  return match?.[1] ? match[1].split('.') : null;
}

function getValueAtPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;

  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function setValueAtPath(root: unknown, path: string[], value: unknown): boolean {
  if (path.length === 0) {
    return false;
  }

  let current: unknown = root;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (segment === undefined) {
      return false;
    }

    if (Array.isArray(current)) {
      const arrayIndex = Number(segment);
      if (!Number.isInteger(arrayIndex)) {
        return false;
      }

      current = current[arrayIndex];
      continue;
    }

    if (!isRecord(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  const lastSegment = path[path.length - 1];
  if (lastSegment === undefined) {
    return false;
  }

  if (Array.isArray(current)) {
    const arrayIndex = Number(lastSegment);
    if (!Number.isInteger(arrayIndex) || current[arrayIndex] === undefined) {
      return false;
    }

    current[arrayIndex] = value;
    return true;
  }

  if (!isRecord(current) || !(lastSegment in current)) {
    return false;
  }

  current[lastSegment] = value;
  return true;
}

function resolvePathValue(root: unknown, path: string[], stack: string[]): unknown {
  const key = path.join('.');
  if (stack.includes(key)) {
    throw new Error(`Circular token reference detected at {${key}}.`);
  }

  const value = getValueAtPath(root, path);
  if (value === undefined) {
    throw new Error(`Token reference {${key}} could not be resolved.`);
  }

  const resolved = resolveNode(value, root, [...stack, key]);
  if (!setValueAtPath(root, path, resolved)) {
    throw new Error(`Resolved token reference {${key}} could not be written back.`);
  }

  return resolved;
}

function resolveNode(node: unknown, root: unknown, stack: string[]): unknown {
  if (typeof node === 'string') {
    const referencePath = parseReferencePath(node);
    return referencePath ? resolvePathValue(root, referencePath, stack) : node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => resolveNode(item, root, stack));
  }

  if (isRecord(node)) {
    for (const [key, value] of Object.entries(node)) {
      node[key] = resolveNode(value, root, stack);
    }
  }

  return node;
}

function parseNumericValue(value: string | number): ParsedValue | null {
  if (typeof value === 'number') {
    return { value, unit: null };
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|ch)?$/);
  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: match[2] ?? null,
  };
}

function toPx(value: string | number, baseFontSize = 16): number | null {
  const parsed = parseNumericValue(value);
  if (!parsed) {
    return null;
  }

  if (parsed.unit === null || parsed.unit === 'px') {
    return parsed.value;
  }

  if (parsed.unit === 'rem' || parsed.unit === 'em') {
    return parsed.value * baseFontSize;
  }

  return null;
}

function toUnitlessLineHeight(
  lineHeight: string | number,
  fontSize: string | number,
): number | null {
  if (typeof lineHeight === 'number') {
    return lineHeight;
  }

  const fontSizePx = toPx(fontSize);
  const parsed = parseNumericValue(lineHeight);

  if (!parsed) {
    return null;
  }

  if (parsed.unit === null) {
    return parsed.value;
  }

  if ((parsed.unit === 'px' || parsed.unit === 'rem' || parsed.unit === 'em') && fontSizePx) {
    const lineHeightPx = toPx(lineHeight);
    return lineHeightPx ? lineHeightPx / fontSizePx : null;
  }

  return null;
}

function toCh(value: string): number | null {
  const parsed = parseNumericValue(value);
  return parsed?.unit === 'ch' ? parsed.value : null;
}

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = value.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
    return null;
  }

  const hex =
    normalized.length === 4
      ? normalized
          .slice(1)
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized.slice(1);

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return [red, green, blue];
}

function toLinearChannel(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getLuminance([red, green, blue]: [number, number, number]): number {
  return (
    0.2126 * toLinearChannel(red) + 0.7152 * toLinearChannel(green) + 0.0722 * toLinearChannel(blue)
  );
}

function getContrastRatio(foreground: string, background: string): number | null {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const foregroundLuminance = getLuminance(foregroundRgb);
  const backgroundLuminance = getLuminance(backgroundRgb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function formatFontFamily(fontFamily: string | string[]): string {
  return Array.isArray(fontFamily) ? fontFamily.join(', ') : fontFamily;
}

function prefixThemeDiagnostics(theme: ThemeMode, diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    rule: `theme.${theme.name}.${diagnostic.rule}`,
    path: diagnostic.path ? `themes.${theme.name}.${diagnostic.path}` : `themes.${theme.name}`,
  }));
}

function validateResolvedTokenSet(
  tokenSet: DesignTokenSet,
  options: Required<BuildOptions>,
  diagnostics: Diagnostic[],
  config?: ValidationConfig,
): void {
  appendTokenDiagnostics(tokenSet, options, diagnostics, config);
}

export function resolveDesignTokenSet(tokenSet: DesignTokenSet): DesignTokenSet {
  const cloned = structuredClone(tokenSet);
  const themes = cloned.themes;
  const modes = cloned.modes;
  cloned.themes = [];
  cloned.modes = {};

  const resolved = resolveNode(cloned, cloned, []) as DesignTokenSet;
  resolved.themes = themes;
  resolved.modes = modes;
  return resolved;
}

export function applyThemeMode(tokenSet: DesignTokenSet, theme: ThemeMode): DesignTokenSet {
  const themed = structuredClone(tokenSet);
  themed.themes = [];

  for (const [path, value] of Object.entries(theme.tokens)) {
    const pathSegments = path.split('.');
    if (getValueAtPath(themed, pathSegments) === undefined) {
      throw new Error(`Theme "${theme.name}" references unknown path "${path}".`);
    }

    if (!setValueAtPath(themed, pathSegments, structuredClone(value))) {
      throw new Error(`Theme "${theme.name}" could not apply override for "${path}".`);
    }
  }

  const resolved = resolveDesignTokenSet(themed);
  resolved.themes = [];
  return resolved;
}

export function applyModeOverride(tokenSet: DesignTokenSet, mode: ModeOverride): DesignTokenSet {
  const moded = structuredClone(tokenSet);
  moded.themes = [];
  moded.modes = {};

  for (const [path, value] of Object.entries(mode.tokens)) {
    const pathSegments = path.split('.');
    if (getValueAtPath(moded, pathSegments) === undefined) {
      throw new Error(`Mode "${mode.name}" references unknown path "${path}".`);
    }

    if (!setValueAtPath(moded, pathSegments, structuredClone(value))) {
      throw new Error(`Mode "${mode.name}" could not apply override for "${path}".`);
    }
  }

  const resolved = resolveDesignTokenSet(moded);
  resolved.themes = [];
  resolved.modes = {};
  return resolved;
}

function prefixModeDiagnostics(mode: ModeOverride, diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    rule: `mode.${mode.name}.${diagnostic.rule}`,
    path: diagnostic.path ? `modes.${mode.name}.${diagnostic.path}` : `modes.${mode.name}`,
  }));
}

function pushDiagnosticWithConfig(
  diagnostics: Diagnostic[],
  config: ValidationConfig | undefined,
  rule: string,
  defaultSeverity: Diagnostic['severity'],
  path: string,
  message: string,
  expected?: string,
  actual?: string,
): void {
  const overrideSeverity = getRuleSeverity(rule, config);
  if (overrideSeverity === false) return; // rule disabled
  const severity = overrideSeverity ?? defaultSeverity;
  diagnostics.push(createDiagnostic(rule, severity, path, message, expected, actual));
}

function appendTokenDiagnostics(
  tokenSet: DesignTokenSet,
  options: Required<BuildOptions>,
  diagnostics: Diagnostic[],
  config?: ValidationConfig,
): void {
  const lightContrast = getContrastRatio(
    tokenSet.color.light.text.primary.value,
    tokenSet.color.light.background.primary.value,
  );
  if (lightContrast !== null && lightContrast < 4.5) {
    pushDiagnosticWithConfig(
      diagnostics, config,
      'contrast.text-primary.light',
      'error',
      'color.light.text.primary',
      'Primary light-mode text does not meet minimum contrast against the light background.',
      '>= 4.5:1',
      `${lightContrast}:1`,
    );
  }

  const darkContrast = getContrastRatio(
    tokenSet.color.dark.text.primary.value,
    tokenSet.color.dark.background.primary.value,
  );
  if (darkContrast !== null && darkContrast < 4.5) {
    pushDiagnosticWithConfig(
      diagnostics, config,
      'contrast.text-primary.dark',
      'error',
      'color.dark.text.primary',
      'Primary dark-mode text does not meet minimum contrast against the dark background.',
      '>= 4.5:1',
      `${darkContrast}:1`,
    );
  }

  const bodyToken = tokenSet.typography.body;
  if (!bodyToken) {
    pushDiagnosticWithConfig(
      diagnostics, config,
      'schema.required-context.body',
      'error',
      'typography.body',
      'The token set is missing the required body typography context.',
    );
  } else {
    const bodyLineHeight = toUnitlessLineHeight(bodyToken.lineHeight, bodyToken.fontSize);
    if (bodyLineHeight !== null && bodyLineHeight < options.minBodyLineHeight) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'text-spacing.body-line-height',
        'warning',
        'typography.body.lineHeight',
        'Body text line-height is below the recommended readability threshold.',
        `>= ${options.minBodyLineHeight}`,
        `${bodyLineHeight}`,
      );
    }
  }

  const buttonToken = tokenSet.typography.button;
  if (!buttonToken) {
    pushDiagnosticWithConfig(
      diagnostics, config,
      'schema.required-context.button',
      'error',
      'typography.button',
      'The token set is missing the required button typography context.',
    );
  } else {
    const buttonFontSize = toPx(buttonToken.fontSize);
    if (buttonFontSize !== null && buttonFontSize < options.minButtonSizePx) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font-size-min.button',
        'warning',
        'typography.button.fontSize',
        'Button font size is below the recommended minimum for interactive UI.',
        `>= ${options.minButtonSizePx}px`,
        `${buttonFontSize}px`,
      );
    }
  }

  const proseWidth = toCh(tokenSet.layout.maxWidth.prose);
  if (proseWidth !== null && proseWidth > options.maxProseWidthCh) {
    pushDiagnosticWithConfig(
      diagnostics, config,
      'line-length.prose',
      'warning',
      'layout.maxWidth.prose',
      'Prose width is wider than the recommended comfortable reading range.',
      `<= ${options.maxProseWidthCh}ch`,
      `${proseWidth}ch`,
    );
  }

  // -- Caption/label min font-size --
  const captionToken = tokenSet.typography.caption;
  if (captionToken) {
    const captionPx = toPx(captionToken.fontSize);
    if (captionPx !== null && captionPx < 11) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font-size-min.caption',
        'warning',
        'typography.caption.fontSize',
        'Caption font size is below the recommended minimum of 11px.',
        '>= 11px',
        `${captionPx}px`,
      );
    }
  }

  const labelToken = tokenSet.typography.label;
  if (labelToken) {
    const labelPx = toPx(labelToken.fontSize);
    if (labelPx !== null && labelPx < 11) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font-size-min.label',
        'warning',
        'typography.label.fontSize',
        'Label font size is below the recommended minimum of 11px.',
        '>= 11px',
        `${labelPx}px`,
      );
    }
  }

  // -- Line-height ratio: heading vs body --
  const h1Token = tokenSet.hierarchy.headings.h1;
  if (bodyToken && h1Token) {
    const h1LineHeight = toUnitlessLineHeight(h1Token.lineHeight, h1Token.fontSize);
    const bodyLh = toUnitlessLineHeight(bodyToken.lineHeight, bodyToken.fontSize);
    if (h1LineHeight !== null && bodyLh !== null && h1LineHeight >= bodyLh) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'line-height.heading-vs-body',
        'warning',
        'hierarchy.headings.h1.lineHeight',
        'Heading line-height should be less than body line-height for proper visual hierarchy.',
        `< ${bodyLh}`,
        `${h1LineHeight}`,
      );
    }
  }

  // -- Spacing scale monotonic --
  const spacingEntries = Object.entries(tokenSet.spacing.scale);
  if (spacingEntries.length > 1) {
    const spacingPxValues = spacingEntries.map(([key, value]) => ({
      key,
      px: toPx(value),
    }));
    for (let i = 1; i < spacingPxValues.length; i += 1) {
      const prev = spacingPxValues[i - 1];
      const curr = spacingPxValues[i];
      if (prev?.px !== null && curr?.px !== null && prev !== undefined && curr !== undefined && prev.px !== null && curr.px !== null && curr.px <= prev.px) {
        pushDiagnosticWithConfig(
          diagnostics, config,
          'spacing.scale-monotonic',
          'warning',
          `spacing.scale.${curr.key}`,
          `Spacing scale values should be monotonically increasing. "${curr.key}" (${curr.px}px) is not greater than "${prev.key}" (${prev.px}px).`,
          `> ${prev.px}px`,
          `${curr.px}px`,
        );
        break;
      }
    }
  }

  // -- Heading size direction: h1 > h2 > ... > h6 --
  const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const headingSizes = headingLevels.map((level) => ({
    level,
    px: toPx(tokenSet.hierarchy.headings[level].fontSize),
  }));
  for (let i = 1; i < headingSizes.length; i += 1) {
    const prev = headingSizes[i - 1];
    const curr = headingSizes[i];
    if (prev?.px !== null && curr?.px !== null && prev !== undefined && curr !== undefined && prev.px !== null && curr.px !== null && curr.px >= prev.px) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'heading.size-direction',
        'warning',
        `hierarchy.headings.${curr.level}.fontSize`,
        `Heading sizes should decrease from h1 to h6. "${curr.level}" (${curr.px}px) is not smaller than "${prev.level}" (${prev.px}px).`,
        `< ${prev.px}px`,
        `${curr.px}px`,
      );
      break;
    }
  }

  // -- Scale divergence --
  const scaleName = tokenSet.hierarchy.scale;
  const scaleRatio = SCALE_RATIOS[scaleName];
  if (scaleRatio !== undefined) {
    const baseSizePx = toPx(tokenSet.hierarchy.baseSize);
    if (baseSizePx !== null) {
      const expected = computeHeadingSizes(baseSizePx, scaleRatio);
      for (const level of headingLevels) {
        const actualPx = toPx(tokenSet.hierarchy.headings[level].fontSize);
        const expectedPx = expected[level];
        if (actualPx !== null && expectedPx !== undefined) {
          const divergence = Math.abs(actualPx - expectedPx) / expectedPx;
          if (divergence > 0.1) {
            pushDiagnosticWithConfig(
              diagnostics, config,
              'heading.scale-divergence',
              'warning',
              `hierarchy.headings.${level}.fontSize`,
              `Heading "${level}" font size diverges more than 10% from the computed ${scaleName} scale.`,
              `~${expectedPx.toFixed(1)}px`,
              `${actualPx}px`,
            );
          }
        }
      }
    }
  }

  // -- F065: Fluid type validation (clamp) --
  const allFontSizes: { path: string; value: string }[] = [];
  for (const [context, token] of Object.entries(tokenSet.typography)) {
    allFontSizes.push({ path: `typography.${context}.fontSize`, value: token.fontSize });
  }
  for (const [level, token] of Object.entries(tokenSet.hierarchy.headings)) {
    allFontSizes.push({ path: `hierarchy.headings.${level}.fontSize`, value: token.fontSize });
  }

  for (const { path, value } of allFontSizes) {
    const clampMatch = value.match(/^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
    if (!clampMatch) continue;

    const minVal = toPx(clampMatch[1]!.trim());
    const maxVal = toPx(clampMatch[3]!.trim());

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font.fluid-type',
        'error',
        path,
        `Fluid type clamp() has min (${minVal}px) greater than max (${maxVal}px).`,
        `min <= max`,
        `${minVal}px > ${maxVal}px`,
      );
    }

    if (minVal !== null && minVal < 12 && path.includes('body')) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font.fluid-type',
        'warning',
        path,
        `Fluid type minimum (${minVal}px) is below the recommended 12px floor for body text.`,
        '>= 12px',
        `${minVal}px`,
      );
    }
  }
}

function appendReferenceDiagnostics(
  tokenSet: DesignTokenSet,
  referenceSystems: string[],
  diagnostics: Diagnostic[],
): ValidationReport['references'] {
  const requestedSystems = referenceSystems.includes('auto')
    ? referenceSystems.filter((system) => system !== 'auto')
    : referenceSystems;
  const autoEvaluations = referenceSystems.includes('auto')
    ? findBestTypographyReferences(tokenSet)
    : [];
  const { evaluations, unknownReferences } = evaluateTypographyReferences(tokenSet, requestedSystems);
  const combinedEvaluations = [...autoEvaluations, ...evaluations].filter(
    (evaluation, index, collection) =>
      collection.findIndex((item) => item.referenceId === evaluation.referenceId) === index,
  );

  for (const unknownReference of unknownReferences) {
    diagnostics.push(
      createDiagnostic(
        'reference-system.unknown',
        'error',
        '<root>',
        `Unknown typography reference "${unknownReference}".`,
      ),
    );
  }

  for (const evaluation of combinedEvaluations) {
    diagnostics.push(
      createDiagnostic(
        `reference-system.${evaluation.referenceId}.score`,
        evaluation.score >= 70 ? 'info' : 'warning',
        '<root>',
        `${evaluation.referenceName} alignment score: ${evaluation.score}%.`,
        '>= 70% recommended for a close match',
        `${evaluation.score}%`,
      ),
    );

    if (evaluation.mismatched.length > 0) {
      diagnostics.push(
        createDiagnostic(
          `reference-system.${evaluation.referenceId}.mismatches`,
          'warning',
          '<root>',
          `${evaluation.referenceName} gaps: ${evaluation.mismatched.slice(0, 3).join('; ')}.`,
        ),
      );
    }
  }

  return combinedEvaluations;
}

function createReport(
  diagnostics: Diagnostic[],
  references: ValidationReport['references'] = [],
): ValidationReport {
  const counts = diagnostics.reduce(
    (accumulator, diagnostic) => {
      accumulator[diagnostic.severity] += 1;
      return accumulator;
    },
    { error: 0, warning: 0, info: 0 },
  );

  return {
    diagnostics,
    references,
    counts,
    pass: counts.error === 0,
  };
}

function toKebabCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function cssVariable(prefix: string, parts: string[]): string {
  return `--${[prefix, ...parts].map(toKebabCase).join('-')}`;
}

function cssVariableFromTokenPath(prefix: string, parts: string[]): string {
  return `--${[prefix, ...parts.map(camelToKebab)].map(toKebabCase).join('-')}`;
}

function pushTypographyVariables(lines: string[], tokenSet: DesignTokenSet, prefix: string): void {
  for (const [context, token] of Object.entries(tokenSet.typography)) {
    lines.push(
      `  ${cssVariable(prefix, ['typography', context, 'font-family'])}: ${formatFontFamily(token.fontFamily)};`,
    );
    lines.push(
      `  ${cssVariable(prefix, ['typography', context, 'font-size'])}: ${token.fontSize};`,
    );
    lines.push(
      `  ${cssVariable(prefix, ['typography', context, 'font-weight'])}: ${token.fontWeight};`,
    );
    lines.push(
      `  ${cssVariable(prefix, ['typography', context, 'line-height'])}: ${token.lineHeight};`,
    );

    if (token.letterSpacing) {
      lines.push(
        `  ${cssVariable(prefix, ['typography', context, 'letter-spacing'])}: ${token.letterSpacing};`,
      );
    }
  }
}

function pushColorVariables(
  lines: string[],
  tokenSet: DesignTokenSet,
  prefix: string,
  mode: 'light' | 'dark',
): void {
  for (const [groupName, group] of Object.entries(tokenSet.color[mode])) {
    for (const [tokenName, tokenValue] of Object.entries(group)) {
      lines.push(
        `  ${cssVariable(prefix, ['color', mode, groupName, tokenName])}: ${tokenValue.value};`,
      );
    }
  }
}

function pushSpacingVariables(lines: string[], tokenSet: DesignTokenSet, prefix: string): void {
  lines.push(`  ${cssVariable(prefix, ['spacing', 'unit'])}: ${tokenSet.spacing.unit};`);

  for (const [tokenName, tokenValue] of Object.entries(tokenSet.spacing.scale)) {
    lines.push(`  ${cssVariable(prefix, ['spacing', tokenName])}: ${tokenValue};`);
  }
}

function pushLayoutVariables(lines: string[], tokenSet: DesignTokenSet, prefix: string): void {
  for (const [tokenName, tokenValue] of Object.entries(tokenSet.layout.maxWidth)) {
    lines.push(`  ${cssVariable(prefix, ['layout', 'max-width', tokenName])}: ${tokenValue};`);
  }

  for (const [tokenName, tokenValue] of Object.entries(tokenSet.layout.breakpoints)) {
    lines.push(`  ${cssVariable(prefix, ['layout', 'breakpoint', tokenName])}: ${tokenValue};`);
  }

  if (tokenSet.layout.grid) {
    lines.push(
      `  ${cssVariable(prefix, ['layout', 'grid', 'columns'])}: ${tokenSet.layout.grid.columns};`,
    );
    lines.push(`  ${cssVariable(prefix, ['layout', 'grid', 'gap'])}: ${tokenSet.layout.grid.gap};`);
  }
}

function pushHierarchyVariables(lines: string[], tokenSet: DesignTokenSet, prefix: string): void {
  lines.push(`  ${cssVariable(prefix, ['hierarchy', 'scale'])}: ${tokenSet.hierarchy.scale};`);
  lines.push(
    `  ${cssVariable(prefix, ['hierarchy', 'base-size'])}: ${tokenSet.hierarchy.baseSize};`,
  );

  for (const [heading, token] of Object.entries(tokenSet.hierarchy.headings)) {
    lines.push(`  ${cssVariable(prefix, ['heading', heading, 'font-size'])}: ${token.fontSize};`);
    lines.push(
      `  ${cssVariable(prefix, ['heading', heading, 'font-weight'])}: ${token.fontWeight};`,
    );
    lines.push(
      `  ${cssVariable(prefix, ['heading', heading, 'line-height'])}: ${token.lineHeight};`,
    );
  }
}

export function parseDesignTokenSet(input: unknown): DesignTokenSet {
  return DesignTokenSetSchema.parse(input);
}

export function validateDesignTokenSet(
  input: unknown,
  options: BuildOptions = {},
  validationConfig?: ValidationConfig,
): ValidationReport {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const parsed = DesignTokenSetSchema.safeParse(input);

  if (!parsed.success) {
    const diagnostics = parsed.error.issues.map((issue) =>
      createDiagnostic('schema.invalid', 'error', issue.path.join('.'), issue.message),
    );

    return createReport(diagnostics);
  }

  const diagnostics: Diagnostic[] = [];
  const seenThemeNames = new Set<string>();
  for (const theme of parsed.data.themes) {
    if (seenThemeNames.has(theme.name)) {
      diagnostics.push(
        createDiagnostic(
          'theme.duplicate-name',
          'error',
          `themes.${theme.name}`,
          `Duplicate theme name "${theme.name}" found in token set.`,
        ),
      );
    }

    seenThemeNames.add(theme.name);
  }

  let resolvedBase: DesignTokenSet;
  try {
    resolvedBase = resolveDesignTokenSet(parsed.data);
  } catch (error) {
    diagnostics.push(
      createDiagnostic(
        'reference.invalid',
        'error',
        '<root>',
        error instanceof Error ? error.message : String(error),
      ),
    );
    return createReport(diagnostics);
  }

  validateResolvedTokenSet(resolvedBase, mergedOptions, diagnostics, validationConfig);

  for (const theme of parsed.data.themes) {
    try {
      const resolvedTheme = applyThemeMode(resolvedBase, theme);
      const themeDiagnostics: Diagnostic[] = [];
      validateResolvedTokenSet(resolvedTheme, mergedOptions, themeDiagnostics, validationConfig);
      diagnostics.push(...prefixThemeDiagnostics(theme, themeDiagnostics));
    } catch (error) {
      diagnostics.push(
        createDiagnostic(
          'theme.invalid-override',
          'error',
          `themes.${theme.name}`,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }

    // Theme dark-mode completeness: if a theme modifies color.light.*, it should also modify color.dark.*
    const lightTokenPaths = Object.keys(theme.tokens).filter((path) =>
      path.startsWith('color.light.'),
    );
    if (lightTokenPaths.length > 0) {
      const darkTokenPaths = new Set(
        Object.keys(theme.tokens).filter((path) => path.startsWith('color.dark.')),
      );
      for (const lightPath of lightTokenPaths) {
        const correspondingDark = lightPath.replace('color.light.', 'color.dark.');
        if (!darkTokenPaths.has(correspondingDark)) {
          diagnostics.push(
            createDiagnostic(
              'theme.dark-mode-completeness',
              'warning',
              `themes.${theme.name}`,
              `Theme "${theme.name}" overrides "${lightPath}" but does not override the corresponding dark token "${correspondingDark}".`,
            ),
          );
        }
      }
    }
  }

  // -- Mode validation --
  for (const [modeName, mode] of Object.entries(parsed.data.modes)) {
    try {
      const resolvedMode = applyModeOverride(resolvedBase, mode);
      const modeDiagnostics: Diagnostic[] = [];
      validateResolvedTokenSet(resolvedMode, mergedOptions, modeDiagnostics, validationConfig);
      diagnostics.push(...prefixModeDiagnostics(mode, modeDiagnostics));

      // Warn if mode sets line-height below minimum body threshold
      const bodyLhOverride = mode.tokens['typography.body.lineHeight'];
      if (bodyLhOverride !== undefined) {
        const numericLh = typeof bodyLhOverride === 'number' ? bodyLhOverride : null;
        if (numericLh !== null && numericLh < mergedOptions.minBodyLineHeight) {
          diagnostics.push(
            createDiagnostic(
              `mode.${modeName}.line-height-below-body-min`,
              'warning',
              `modes.${modeName}.typography.body.lineHeight`,
              `Mode "${modeName}" overrides body line-height to ${numericLh}, which is below the minimum threshold of ${mergedOptions.minBodyLineHeight}.`,
              `>= ${mergedOptions.minBodyLineHeight}`,
              `${numericLh}`,
            ),
          );
        }
      }

      // Warn if mode changes fontFamily to a single string without fallbacks
      for (const [tokenPath, tokenValue] of Object.entries(mode.tokens)) {
        if (tokenPath.endsWith('.fontFamily')) {
          const isBareString = typeof tokenValue === 'string';
          const isSingleArray = Array.isArray(tokenValue) && tokenValue.length === 1;
          if (isBareString || isSingleArray) {
            diagnostics.push(
              createDiagnostic(
                `mode.${modeName}.font-family-no-fallback`,
                'warning',
                `modes.${modeName}.${tokenPath}`,
                `Mode "${modeName}" sets "${tokenPath}" without fallback fonts. Consider adding at least one generic fallback.`,
              ),
            );
          }
        }
      }
    } catch (error) {
      diagnostics.push(
        createDiagnostic(
          'mode.invalid-override',
          'error',
          `modes.${modeName}`,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  const references = mergedOptions.referenceSystems.length
    ? appendReferenceDiagnostics(resolvedBase, mergedOptions.referenceSystems, diagnostics)
    : [];

  return createReport(diagnostics, references);
}

export function generateCssVariables(tokenSet: DesignTokenSet, options: BuildOptions = {}): string {
  const prefix = options.prefix ?? DEFAULT_OPTIONS.prefix;
  const resolvedBase = resolveDesignTokenSet(tokenSet);
  const rootLines = [':root {'];

  pushTypographyVariables(rootLines, resolvedBase, prefix);
  pushColorVariables(rootLines, resolvedBase, prefix, 'light');
  pushSpacingVariables(rootLines, resolvedBase, prefix);
  pushLayoutVariables(rootLines, resolvedBase, prefix);
  pushHierarchyVariables(rootLines, resolvedBase, prefix);
  rootLines.push('}');

  const darkLines = ['[data-theme="dark"] {'];
  pushColorVariables(darkLines, resolvedBase, prefix, 'dark');
  darkLines.push('}');

  const themeBlocks: string[] = [];
  for (const theme of tokenSet.themes) {
    const themedTokenSet = applyThemeMode(resolvedBase, theme);
    const selector = theme.selector ?? `[data-theme="${theme.name}"]`;
    const lines = [`${selector} {`];
    pushTypographyVariables(lines, themedTokenSet, prefix);
    pushColorVariables(lines, themedTokenSet, prefix, 'light');
    pushColorVariables(lines, themedTokenSet, prefix, 'dark');
    pushSpacingVariables(lines, themedTokenSet, prefix);
    pushLayoutVariables(lines, themedTokenSet, prefix);
    pushHierarchyVariables(lines, themedTokenSet, prefix);
    lines.push('}');
    themeBlocks.push(...lines, '');
  }

  const modeBlocks: string[] = [];
  for (const [modeName, mode] of Object.entries(tokenSet.modes)) {
    const modedTokenSet = applyModeOverride(resolvedBase, mode);
    const selector = `[data-mode="${modeName}"]`;
    const lines = [`${selector} {`];

    // Only emit variables that the mode actually overrides
    for (const [tokenPath] of Object.entries(mode.tokens)) {
      const pathParts = tokenPath.split('.');
      const resolvedValue = getValueAtPath(modedTokenSet, pathParts);
      const varName = cssVariableFromTokenPath(prefix, pathParts);
      if (Array.isArray(resolvedValue)) {
        lines.push(`  ${varName}: ${resolvedValue.join(', ')};`);
      } else if (resolvedValue !== undefined) {
        lines.push(`  ${varName}: ${resolvedValue};`);
      }
    }

    lines.push('}');
    modeBlocks.push(...lines, '');
  }

  return [...rootLines, '', ...darkLines, '', ...themeBlocks, ...modeBlocks].join('\n');
}

export function buildTokenArtifacts(
  input: unknown,
  options: BuildOptions = {},
  validationConfig?: ValidationConfig,
): BuildArtifacts {
  const authoredTokenSet = parseDesignTokenSet(input);
  const tokenSet = resolveDesignTokenSet(authoredTokenSet);
  const report = validateDesignTokenSet(authoredTokenSet, options, validationConfig);
  tokenSet.themes = authoredTokenSet.themes;
  tokenSet.modes = authoredTokenSet.modes;

  return {
    tokenSet,
    report,
    css: generateCssVariables(authoredTokenSet, options),
    json: JSON.stringify(tokenSet, null, 2),
  };
}

const SYSTEM_FONT_FAMILY_SET = new Set(
  Object.values(SYSTEM_FONT_STACKS).flat().map((f) => f.toLowerCase()),
);

export function validateFonts(tokenSet: DesignTokenSet, config?: ValidationConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const seenFamilies = new Map<string, number>();

  // Collect all fontFamily values from typography contexts and headings
  const fontFamilySources: { path: string; fontFamily: string | string[] }[] = [];

  for (const [context, token] of Object.entries(tokenSet.typography)) {
    fontFamilySources.push({
      path: `typography.${context}.fontFamily`,
      fontFamily: token.fontFamily,
    });
  }

  for (const [level, token] of Object.entries(tokenSet.hierarchy.headings)) {
    if (token.fontFamily) {
      fontFamilySources.push({
        path: `hierarchy.headings.${level}.fontFamily`,
        fontFamily: token.fontFamily,
      });
    }
  }

  for (const { path, fontFamily } of fontFamilySources) {
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];

    // Skip token references — they'll be resolved elsewhere
    if (families.length === 1 && families[0] && TOKEN_REFERENCE_PATTERN.test(families[0])) {
      continue;
    }

    // Missing fallbacks check
    if (families.length <= 1) {
      diagnostics.push(
        createDiagnostic(
          'font.missing-fallbacks',
          'warning',
          path,
          'Font family has no fallback fonts. Add at least one generic fallback (e.g., sans-serif, serif).',
        ),
      );
    }

    // Track the primary family for payload estimation
    const primary = families[0];
    if (primary && !TOKEN_REFERENCE_PATTERN.test(primary)) {
      const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
      if (!seenFamilies.has(key)) {
        const entry = lookupFont(key);
        if (entry) {
          seenFamilies.set(key, entry.sizeKb);
        } else if (!SYSTEM_FONT_FAMILY_SET.has(key)) {
          // Font availability check
          diagnostics.push(
            createDiagnostic(
              'font.unknown-family',
              'info',
              path,
              `Font "${primary}" is not found in the Google Fonts catalog or system font stacks.`,
            ),
          );
          seenFamilies.set(key, 0);
        } else {
          seenFamilies.set(key, 0);
        }
      }
    }
  }

  // Payload estimate check
  const totalPayloadKb = [...seenFamilies.values()].reduce((sum, kb) => sum + kb, 0);
  if (totalPayloadKb > 150) {
    diagnostics.push(
      createDiagnostic(
        'font.payload-estimate',
        'warning',
        'typography',
        `Estimated total font payload (~${totalPayloadKb}KB) exceeds the recommended 150KB budget.`,
        '<= 150KB',
        `~${totalPayloadKb}KB`,
      ),
    );
  }

  // -- F061: Font weight consistency validation --
  for (const { path, fontFamily } of fontFamilySources) {
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
    const primary = families[0];
    if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;

    const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
    const registryEntry = resolveFont(key);
    if (!registryEntry) continue;

    // Find the fontWeight for this token
    const pathParts = path.split('.');
    let fontWeight: number | string | undefined;
    if (pathParts[0] === 'typography') {
      const ctx = pathParts[1] as string;
      fontWeight = tokenSet.typography[ctx as keyof typeof tokenSet.typography]?.fontWeight;
    } else if (pathParts[0] === 'hierarchy' && pathParts[1] === 'headings') {
      const level = pathParts[2] as keyof typeof tokenSet.hierarchy.headings;
      fontWeight = tokenSet.hierarchy.headings[level]?.fontWeight;
    }

    if (fontWeight !== undefined) {
      const numWeight = typeof fontWeight === 'string' ? parseInt(fontWeight, 10) : fontWeight;
      if (!isNaN(numWeight) && registryEntry.weights.length > 0 && !registryEntry.weights.includes(numWeight)) {
        // For variable fonts, check the wght axis range instead
        const wghtAxis = registryEntry.axes.find(a => a.tag === 'wght');
        if (wghtAxis) {
          if (numWeight < wghtAxis.min || numWeight > wghtAxis.max) {
            diagnostics.push(
              createDiagnostic(
                'font.weight-available',
                'warning',
                path.replace('.fontFamily', '.fontWeight'),
                `Font "${registryEntry.family}" variable weight axis range is ${wghtAxis.min}-${wghtAxis.max}, but weight ${numWeight} is used.`,
                `${wghtAxis.min}-${wghtAxis.max}`,
                `${numWeight}`,
              ),
            );
          }
        } else {
          diagnostics.push(
            createDiagnostic(
              'font.weight-available',
              'warning',
              path.replace('.fontFamily', '.fontWeight'),
              `Font "${registryEntry.family}" does not offer weight ${numWeight}. Available: ${registryEntry.weights.join(', ')}.`,
              registryEntry.weights.join(', '),
              `${numWeight}`,
            ),
          );
        }
      }
    }
  }

  // -- F062: Variable font axis validation --
  for (const { path, fontFamily } of fontFamilySources) {
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
    const primary = families[0];
    if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;

    const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
    const registryEntry = resolveFont(key);
    if (!registryEntry || !registryEntry.variable || registryEntry.axes.length === 0) continue;

    // Check optical sizing axis
    if (registryEntry.hasOpticalSizing) {
      const opszAxis = registryEntry.axes.find(a => a.tag === 'opsz');
      if (opszAxis) {
        const pathParts = path.split('.');
        let fontSize: string | undefined;
        if (pathParts[0] === 'typography') {
          const ctx = pathParts[1] as string;
          fontSize = tokenSet.typography[ctx as keyof typeof tokenSet.typography]?.fontSize;
        } else if (pathParts[0] === 'hierarchy' && pathParts[1] === 'headings') {
          const level = pathParts[2] as keyof typeof tokenSet.hierarchy.headings;
          fontSize = tokenSet.hierarchy.headings[level]?.fontSize;
        }
        if (fontSize) {
          const px = toPx(fontSize);
          if (px !== null && (px < opszAxis.min || px > opszAxis.max)) {
            diagnostics.push(
              createDiagnostic(
                'font.axis-range',
                'info',
                path.replace('.fontFamily', '.fontSize'),
                `Font "${registryEntry.family}" optical size axis range is ${opszAxis.min}-${opszAxis.max}pt. Font size ${px}px is outside this range.`,
                `${opszAxis.min}-${opszAxis.max}`,
                `${px}`,
              ),
            );
          }
        }
      }
    }
  }

  // -- F063: Subset coverage validation --
  if (tokenSet.requiredSubsets && tokenSet.requiredSubsets.length > 0) {
    const checkedFamilies = new Set<string>();
    for (const { path, fontFamily } of fontFamilySources) {
      const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
      const primary = families[0];
      if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;

      const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
      if (checkedFamilies.has(key)) continue;
      checkedFamilies.add(key);

      const registryEntry = resolveFont(key);
      if (!registryEntry) continue;

      const missingSubsets = tokenSet.requiredSubsets.filter(
        sub => !registryEntry.subsets.includes(sub),
      );
      if (missingSubsets.length > 0) {
        diagnostics.push(
          createDiagnostic(
            'font.subset-coverage',
            'warning',
            path,
            `Font "${registryEntry.family}" is missing required subsets: ${missingSubsets.join(', ')}.`,
            tokenSet.requiredSubsets.join(', '),
            registryEntry.subsets.join(', '),
          ),
        );
      }
    }
  }

  // -- F064: Font loading strategy validation --
  if (tokenSet.fontDisplay === 'auto') {
    diagnostics.push(
      createDiagnostic(
        'font.display-strategy',
        'warning',
        'fontDisplay',
        'font-display is set to "auto". Consider "swap" for text visibility or "optional" for performance.',
        '"swap" or "optional"',
        '"auto"',
      ),
    );
  }

  let fontFaceCount = 0;
  for (const [, entry] of seenFamilies) {
    if (entry > 0) fontFaceCount++;
  }
  if (fontFaceCount > 4) {
    diagnostics.push(
      createDiagnostic(
        'font.preload-count',
        'warning',
        'typography',
        `${fontFaceCount} web fonts are loaded. Consider reducing to 4 or fewer, or using preload hints for critical fonts.`,
        '<= 4 web fonts',
        `${fontFaceCount}`,
      ),
    );
  }

  // -- Font platform rendering check --
  // Validates that fonts have acceptable metric drift across rendering targets.
  // A size-adjust > 5% from 100% means the font will look noticeably different
  // on that platform when the web font fails to load.
  for (const { path, fontFamily } of fontFamilySources) {
    const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
    const primary = families[0];
    if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;
    const resolved = resolveFont(primary);
    if (!resolved) continue;
    const targets = resolved.fallback?.targets;
    if (!targets || targets.length === 0) continue;
    for (const t of targets) {
      const sizeAdj = parseFloat(t.overrides.sizeAdjust);
      if (isNaN(sizeAdj)) continue;
      const drift = Math.abs(sizeAdj - 100);
      if (drift >= 8) {
        pushDiagnosticWithConfig(
          diagnostics, config,
          'font.platform-rendering',
          'warning',
          path,
          `"${primary}" has ${drift.toFixed(1)}% metric drift on ${t.target} (fallback: ${t.fallbackFont}). Users on this platform will see a noticeable layout shift when the web font loads. Consider testing or providing a tighter fallback.`,
          '<= 5% size-adjust drift',
          `${drift.toFixed(1)}% on ${t.target}`,
        );
      }
    }
    // Check if font requires platform-specific fallback splits
    if (resolved.fallback?.requiresPlatformSplit) {
      pushDiagnosticWithConfig(
        diagnostics, config,
        'font.platform-rendering',
        'info',
        path,
        `"${primary}" requires platform-specific fallback CSS for optimal rendering. Use \`fetchtype resolve ${primary.toLowerCase().replace(/ /g, '-')} --css\` to generate per-platform @font-face rules.`,
        'Single fallback',
        'Platform split required',
      );
    }
  }

  // -- F076: Font allowlist --
  if (config?.fonts?.allow && config.fonts.allow.length > 0) {
    const allowSet = new Set(config.fonts.allow.map((f) => f.toLowerCase()));
    const allowlistSeverity = getRuleSeverity('policy.font-allowlist', config);
    if (allowlistSeverity !== false) {
      const severity = (typeof allowlistSeverity === 'string' ? allowlistSeverity : 'error') as Diagnostic['severity'];
      for (const { path, fontFamily } of fontFamilySources) {
        const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
        // Skip token references
        if (families.length === 1 && families[0] && TOKEN_REFERENCE_PATTERN.test(families[0])) {
          continue;
        }
        const primary = families[0];
        if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;
        const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
        // Allow if in the allowlist or it's a known system font
        if (!allowSet.has(key) && !SYSTEM_FONT_FAMILY_SET.has(key)) {
          diagnostics.push(
            createDiagnostic(
              'policy.font-allowlist',
              severity,
              path,
              `Font "${primary}" is not in the project font allowlist.`,
              config.fonts.allow.join(', '),
              primary,
            ),
          );
        }
      }
    }
  }

  // -- F076: Font blocklist --
  if (config?.fonts?.block && config.fonts.block.length > 0) {
    const blocklistSeverity = getRuleSeverity('policy.font-blocklist', config);
    if (blocklistSeverity !== false) {
      const severity = (typeof blocklistSeverity === 'string' ? blocklistSeverity : 'error') as Diagnostic['severity'];
      // Normalize blocklist entries to { family: string; reason?: string }
      const blockEntries = config.fonts.block.map((entry) =>
        typeof entry === 'string'
          ? { family: entry, reason: undefined }
          : { family: entry.family, reason: entry.reason },
      );
      const blockMap = new Map(
        blockEntries.map((e) => [e.family.toLowerCase(), e.reason]),
      );
      for (const { path, fontFamily } of fontFamilySources) {
        const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
        if (families.length === 1 && families[0] && TOKEN_REFERENCE_PATTERN.test(families[0])) {
          continue;
        }
        const primary = families[0];
        if (!primary || TOKEN_REFERENCE_PATTERN.test(primary)) continue;
        const key = primary.toLowerCase().replace(/^["']|["']$/g, '');
        if (blockMap.has(key)) {
          const reason = blockMap.get(key);
          const reasonSuffix = reason ? ` Reason: ${reason}` : '';
          diagnostics.push(
            createDiagnostic(
              'policy.font-blocklist',
              severity,
              path,
              `Font "${primary}" is on the project blocklist.${reasonSuffix}`,
              undefined,
              primary,
            ),
          );
        }
      }
    }
  }

  return diagnostics;
}

export { DEFAULT_TOKEN_SET, getPreset, PRESET_NAMES, PRESETS };
export { computeHeadingSizes, generateHeadings, SCALE_RATIOS } from './scale.js';
export { generateTailwindConfig } from './exporters/tailwind.js';
export { generateShadcnCss } from './exporters/shadcn.js';
export { generateHtmlReport } from './report.js';
export {
  evaluateTypographyReferences,
  findBestTypographyReferences,
  getAllTypographySystemIds,
  getTypographySystemById,
  queryTypographySystems,
  TYPOGRAPHY_PATTERNS,
  TYPOGRAPHY_SYSTEMS,
} from './systems.js';
export { importW3cTokens, exportW3cTokens } from './w3c.js';
export {
  computeFallbackOverrides,
  computeFallbackTargets,
  generateFallbackCSS,
  requiresPlatformSplit,
  SYSTEM_FALLBACK_METRICS,
  type CSSOverrides,
  type FallbackCSSOptions,
} from './fallback.js';
export {
  prepareFont,
  generateFontFaceCSS,
  generatePreloadTags,
  type PrepareOptions,
  type PrepareManifest,
} from './prepare.js';
export {
  auditDirectory,
  generateCorrectedTokens,
  formatAuditReport,
  formatAuditMigrationGuide,
  type AuditIssue,
  type AuditResult,
  type DetectedFont,
} from './audit.js';
export { auditUrl } from './audit-url.js';
export { formatSarifReport, type SarifLog } from './sarif.js';
export { detectDrift, type DriftReport, type DriftChange, type DriftChangeKind } from './drift.js';
export { resolveConfig } from './config-resolver.js';
export { resolveProfile, BUILT_IN_PROFILES } from './profiles.js';
export { generateTokenSet, type GenerateOptions, type GenerateResult } from './generate.js';
