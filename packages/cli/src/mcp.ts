import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  buildTokenArtifacts,
  generateShadcnCss,
  generateTailwindConfig,
  getPreset,
  PRESET_NAMES,
  prepareFont,
  queryTypographySystems,
  validateDesignTokenSet,
  auditDirectory,
  formatAuditReport,
  generateTokenSet,
} from '@fetchtype/core';
import { suggestFonts, type SuggestionContext, resolveFont, searchRegistry, recommendPairings, registryStats } from '@fetchtype/fonts';
import { generateFallbackCSS } from '@fetchtype/core';
import type {
  AgentDecision,
  Diagnostic,
  TypographySystemsResult,
  ValidationReport,
} from '@fetchtype/types';
import { resolvePromptToTokenSet } from './prompt-init.js';

type ToolSchema = Record<string, z.ZodTypeAny>;

type ToolArgs = Record<string, unknown>;

type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

type ToolHandler = (args: ToolArgs) => ToolResponse | Promise<ToolResponse>;

type AgentPriority = 'high' | 'medium' | 'low';

type AgentImplementationItem = {
  rule: string;
  priority: AgentPriority;
  path: string;
  changeType:
    | 'increase'
    | 'decrease'
    | 'add'
    | 'remove'
    | 'align'
    | 'review'
    | 'correct';
  instruction: string;
  expected?: string;
  actual?: string;
};

type AgentValidationPayload = {
  format: 'fetchtype-agent-validation/v1';
  summary: {
    pass: boolean;
    counts: ValidationReport['counts'];
    referenceSystems: string[];
  };
  blockingIssues: AgentImplementationItem[];
  followUpIssues: AgentImplementationItem[];
  referenceEvaluations: ValidationReport['references'];
  implementationPlan: AgentImplementationItem[];
  rawReport: ValidationReport;
};

type AgentSystemsPayload = {
  format: 'fetchtype-agent-systems/v1';
  query: {
    text?: string;
    useCase?: string;
    style?: string;
    kind: string;
  };
  recommendations: Array<{
    referenceId: string;
    name: string;
    kind: string;
    rationale: string[];
    implementationKeywords: string[];
    tokenBias: {
      primaryCategory: 'serif' | 'sans' | 'mono' | 'system';
      density: 'compact' | 'balanced' | 'comfortable' | 'expressive';
      hierarchy: 'semantic' | 'scale-led' | 'editorial' | 'technical';
    };
  }>;
  patterns: Array<{
    id: string;
    name: string;
    summary: string;
    implementationImplications: string[];
  }>;
  nextCommands: string[];
  rawResult: TypographySystemsResult;
};

type AgentInitPayload = {
  format: 'fetchtype-agent-init/v1';
  summary: {
    source: 'preset' | 'prompt' | 'default';
    preset?: string;
    prompt?: string;
    reasoning: string;
  };
  recommendedReferences: Array<{
    referenceId: string;
    referenceName: string;
    score: number;
    why: string;
  }>;
  nextCommands: string[];
  tokenSet: unknown;
};

type AgentSuggestPayload = {
  format: 'fetchtype-agent-suggest/v1';
  summary: {
    context: SuggestionContext;
    variableOnly: boolean;
    referenceSystem?: string;
  };
  relatedReferences: Array<{
    referenceId: string;
    name: string;
    reason: string;
  }>;
  suggestions: Array<{
    family: string;
    category: string;
    variable: boolean;
    sizeKb: number;
    rationale: string;
  }>;
  implementationNotes: string[];
  nextCommands: string[];
};

function registerTool(
  server: McpServer,
  name: string,
  description: string,
  params: ToolSchema,
  handler: ToolHandler,
): void {
  const register = server.tool.bind(server) as unknown as (
    toolName: string,
    toolDescription: string,
    toolParams: ToolSchema,
    toolHandler: ToolHandler,
  ) => unknown;

  register(name, description, params, handler);
}

function textResponse(text: string, isError = false): ToolResponse {
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  };
}

function wrapDecision(payload: unknown, decision: AgentDecision): string {
  return JSON.stringify({ ...decision, data: payload }, null, 2);
}

function getPriority(severity: Diagnostic['severity']): AgentPriority {
  if (severity === 'error') {
    return 'high';
  }

  if (severity === 'warning') {
    return 'medium';
  }

  return 'low';
}

function inferChangeType(rule: string): AgentImplementationItem['changeType'] {
  if (
    rule.startsWith('contrast.') ||
    rule.includes('font-size-min') ||
    rule.includes('line-height')
  ) {
    return 'increase';
  }

  if (rule.includes('line-length') || rule.includes('payload') || rule.includes('size-direction')) {
    return 'decrease';
  }

  if (rule.includes('missing-fallback') || rule.includes('required-context')) {
    return 'add';
  }

  if (rule.includes('unknown') || rule.includes('invalid')) {
    return 'correct';
  }

  if (rule.includes('reference-system')) {
    return 'align';
  }

  return 'review';
}

function inferInstruction(diagnostic: Diagnostic): string {
  if (diagnostic.rule.startsWith('contrast.')) {
    return 'Adjust the foreground/background token pair until it meets WCAG AA contrast.';
  }

  if (diagnostic.rule === 'text-spacing.body-line-height') {
    return 'Increase body line-height to the recommended readability threshold or higher.';
  }

  if (diagnostic.rule.startsWith('font-size-min.')) {
    return 'Increase the font size for this context to meet the minimum readable threshold.';
  }

  if (diagnostic.rule === 'line-length.prose') {
    return 'Reduce `layout.maxWidth.prose` so long-form reading stays within the target measure.';
  }

  if (diagnostic.rule === 'spacing.scale-monotonic') {
    return 'Reorder or increase spacing tokens so each step is larger than the previous one.';
  }

  if (diagnostic.rule === 'heading.size-direction') {
    return 'Make heading sizes descend from `h1` through `h6` without reversals.';
  }

  if (diagnostic.rule === 'heading.scale-divergence') {
    return 'Realign heading sizes to the declared type scale or change the scale token.';
  }

  if (diagnostic.rule === 'font.missing-fallbacks') {
    return 'Add generic fallback families after the primary family.';
  }

  if (diagnostic.rule === 'font.payload-estimate') {
    return 'Reduce unique families, weights, or variable-font scope to lower payload.';
  }

  if (diagnostic.rule === 'reference-system.unknown') {
    return 'Replace the unknown reference id with a valid system or archetype id.';
  }

  if (diagnostic.rule.endsWith('.mismatches')) {
    return 'Adjust the token set toward the selected reference profile before implementation.';
  }

  if (diagnostic.rule.endsWith('.score')) {
    return 'Use this score to decide whether the current token set is close enough to the target reference.';
  }

  return diagnostic.message;
}

function toImplementationItem(diagnostic: Diagnostic): AgentImplementationItem {
  return {
    rule: diagnostic.rule,
    priority: getPriority(diagnostic.severity),
    path: diagnostic.path,
    changeType: inferChangeType(diagnostic.rule),
    instruction: inferInstruction(diagnostic),
    ...(diagnostic.expected ? { expected: diagnostic.expected } : {}),
    ...(diagnostic.actual ? { actual: diagnostic.actual } : {}),
  };
}

export function formatAgentValidationPayload(
  report: ValidationReport,
  referenceSystems: string[],
): AgentValidationPayload {
  const items = report.diagnostics.map(toImplementationItem);
  const blockingIssues = items.filter((item) => item.priority === 'high');
  const followUpIssues = items.filter((item) => item.priority !== 'high');

  return {
    format: 'fetchtype-agent-validation/v1',
    summary: {
      pass: report.pass,
      counts: report.counts,
      referenceSystems,
    },
    blockingIssues,
    followUpIssues,
    referenceEvaluations: report.references,
    implementationPlan: [...blockingIssues, ...followUpIssues],
    rawReport: report,
  };
}

function inferPrimaryCategory(fonts: string[]): 'serif' | 'sans' | 'mono' | 'system' {
  const joined = fonts.join(' ').toLowerCase();

  if (joined.includes('mono')) {
    return 'mono';
  }

  if (joined.includes('system-ui') || joined.includes('sf pro') || joined.includes('segoe')) {
    return 'system';
  }

  if (
    joined.includes('serif') ||
    joined.includes('georgia') ||
    joined.includes('garamond') ||
    joined.includes('didot') ||
    joined.includes('bodoni') ||
    joined.includes('canela')
  ) {
    return 'serif';
  }

  return 'sans';
}

function inferDensity(styles: string[]): 'compact' | 'balanced' | 'comfortable' | 'expressive' {
  if (styles.some((style) => ['data-dense', 'functional-ui', 'productive-ui'].includes(style))) {
    return 'compact';
  }

  if (
    styles.some((style) => ['editorial-serif', 'bookish', 'accessible-public-sector'].includes(style))
  ) {
    return 'comfortable';
  }

  if (styles.some((style) => ['display-led', 'expressive-ui', 'luxury'].includes(style))) {
    return 'expressive';
  }

  return 'balanced';
}

function inferHierarchy(styles: string[]): 'semantic' | 'scale-led' | 'editorial' | 'technical' {
  if (styles.some((style) => ['semantic-ramp', 'systematic-ui'].includes(style))) {
    return 'semantic';
  }

  if (styles.some((style) => ['editorial-serif', 'display-led'].includes(style))) {
    return 'editorial';
  }

  if (styles.some((style) => ['mono-technical', 'developer-centric'].includes(style))) {
    return 'technical';
  }

  return 'scale-led';
}

export function formatAgentSystemsPayload(
  result: TypographySystemsResult,
  query: { text?: string; useCase?: string; style?: string; kind: string },
): AgentSystemsPayload {
  const recommendations = result.systems.slice(0, 4).map((system) => ({
    referenceId: system.id,
    name: system.name,
    kind: system.kind,
    rationale: [
      system.summary,
      ...system.characteristics.slice(0, 2),
    ],
    implementationKeywords: system.keywords.slice(0, 8),
    tokenBias: {
      primaryCategory: inferPrimaryCategory(system.fonts),
      density: inferDensity(system.styles),
      hierarchy: inferHierarchy(system.styles),
    },
  }));

  const nextCommands = recommendations.slice(0, 2).map(
    (system) =>
      `fetchtype validate -i <tokens.json> --reference ${system.referenceId} --json`,
  );

  return {
    format: 'fetchtype-agent-systems/v1',
    query,
    recommendations,
    patterns: result.patterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      summary: pattern.summary,
      implementationImplications: pattern.implications,
    })),
    nextCommands,
    rawResult: result,
  };
}



function getRelatedSystemsForContext(context: SuggestionContext): TypographySystemsResult {
  const useCaseMap: Record<SuggestionContext, string> = {
    display: 'marketing-brand',
    interface: 'saas-ui',
    reading: 'editorial-publishing',
    mono: 'developer-tools',
  };

  return queryTypographySystems({ useCase: useCaseMap[context] });
}

export function formatAgentInitPayload(input: {
  tokenSet: unknown;
  reasoning: string;
  recommendedReferences: Array<{
    referenceId: string;
    referenceName: string;
    score: number;
  }>;
  source: 'preset' | 'prompt' | 'default';
  preset?: string;
  prompt?: string;
}): AgentInitPayload {
  return {
    format: 'fetchtype-agent-init/v1',
    summary: {
      source: input.source,
      ...(input.preset ? { preset: input.preset } : {}),
      ...(input.prompt ? { prompt: input.prompt } : {}),
      reasoning: input.reasoning,
    },
    recommendedReferences: input.recommendedReferences.map((reference) => ({
      ...reference,
      why: `Use \`${reference.referenceId}\` as the first validation target for this token set.`,
    })),
    nextCommands: [
      'fetchtype validate -i <tokens.json> --reference auto --json',
      ...input.recommendedReferences
        .slice(0, 2)
        .map(
          (reference) =>
            `fetchtype validate -i <tokens.json> --reference ${reference.referenceId} --json`,
        ),
    ],
    tokenSet: input.tokenSet,
  };
}

export function formatAgentSuggestPayload(input: {
  context: SuggestionContext;
  variableOnly: boolean;
  referenceSystem?: string;
  suggestions: Array<{
    family: string;
    category: string;
    reason: string;
    variable: boolean;
    sizeKb: number;
  }>;
}): AgentSuggestPayload {
  const relatedResult = input.referenceSystem
    ? queryTypographySystems({ query: input.referenceSystem })
    : getRelatedSystemsForContext(input.context);
  const relatedReferences = relatedResult.systems.slice(0, 3).map((system) => ({
    referenceId: system.id,
    name: system.name,
    reason: system.summary,
  }));

  return {
    format: 'fetchtype-agent-suggest/v1',
    summary: {
      context: input.context,
      variableOnly: input.variableOnly,
      ...(input.referenceSystem ? { referenceSystem: input.referenceSystem } : {}),
    },
    relatedReferences,
    suggestions: input.suggestions.map((suggestion) => ({
      family: suggestion.family,
      category: suggestion.category,
      variable: suggestion.variable,
      sizeKb: suggestion.sizeKb,
      rationale: suggestion.reason,
    })),
    implementationNotes: [
      'Pick the first suggestion as the primary candidate unless product constraints override it.',
      'Validate the final token set against one of the related references before build/export.',
    ],
    nextCommands: relatedReferences
      .slice(0, 2)
      .map(
        (reference) =>
          `fetchtype validate -i <tokens.json> --reference ${reference.referenceId} --json`,
      ),
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'fetchtype',
    version: '0.1.0',
  });

  registerTool(
    server,
    'fetchtype_validate',
    'Validate a design token set against fetchtype rules',
    {
      tokens: z.unknown(),
      referenceSystems: z.array(z.string()).optional(),
    },
    async (args) => {
      const tokens = args.tokens;
      const referenceSystems = Array.isArray(args.referenceSystems)
        ? args.referenceSystems.filter((value): value is string => typeof value === 'string')
        : [];
      const report = validateDesignTokenSet(tokens, { referenceSystems });
      const payload = formatAgentValidationPayload(report, referenceSystems);
      const issueCount = report.diagnostics.length;
      const fixNextActions = report.diagnostics.slice(0, 3).map((d) => ({
        tool: 'fetchtype_validate',
        description: `Fix: ${d.rule} — ${d.message}`,
        suggestedArgs: { tokens, referenceSystems },
      }));
      return textResponse(
        wrapDecision(payload, {
          decision: `Validation ${report.pass ? 'passed' : 'failed'} with ${issueCount} issue${issueCount !== 1 ? 's' : ''}`,
          confidence: report.pass ? 1.0 : 0,
          alternatives: [],
          constraints: [],
          nextActions: report.pass
            ? [{ tool: 'fetchtype_build', description: 'Build artifacts from validated token set' }]
            : fixNextActions,
        }),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_build',
    'Build artifacts (CSS, JSON, Tailwind, shadcn) from a design token set',
    {
      tokens: z.unknown(),
      format: z.enum(['css', 'json', 'tailwind', 'shadcn']).optional(),
    },
    async (args) => {
      const tokens = args.tokens;
      const format = args.format;
      const artifacts = buildTokenArtifacts(tokens);

      if (!artifacts.report.pass) {
        return textResponse(JSON.stringify(artifacts.report, null, 2), true);
      }

      const formats = ['css', 'json', 'tailwind', 'shadcn'];
      let output: string;
      switch (format) {
        case 'tailwind':
          output = generateTailwindConfig(artifacts.tokenSet);
          break;
        case 'shadcn':
          output = generateShadcnCss(artifacts.tokenSet);
          break;
        case 'json':
          output = artifacts.json;
          break;
        case 'css':
        default:
          output = artifacts.css;
          break;
      }

      const builtFormats = format ? [format] : formats;
      return textResponse(
        wrapDecision(
          { output, format: format ?? 'css' },
          {
            decision: `Built ${builtFormats.length} format${builtFormats.length !== 1 ? 's' : ''}: ${builtFormats.join(', ')}`,
            confidence: 1.0,
            alternatives: [],
            constraints: [],
            nextActions: [
              { tool: 'fetchtype_prepare', description: 'Prepare fonts for production' },
            ],
          },
        ),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_suggest',
    'Suggest fonts for a given usage context',
    {
      context: z.enum(['display', 'interface', 'reading', 'mono']),
      limit: z.number().optional(),
      referenceSystem: z.string().optional(),
      variableOnly: z.boolean().optional(),
    },
    async (args) => {
      const context = args.context as SuggestionContext;
      const limit = typeof args.limit === 'number' ? args.limit : 5;
      const variableOnly = typeof args.variableOnly === 'boolean' ? args.variableOnly : false;
      const referenceSystem =
        typeof args.referenceSystem === 'string' ? args.referenceSystem : undefined;
      const suggestions = suggestFonts(context, {
        limit,
        variableOnly,
      } as Parameters<typeof suggestFonts>[1]);
      const payload = formatAgentSuggestPayload({
        context,
        variableOnly,
        ...(referenceSystem ? { referenceSystem } : {}),
        suggestions,
      });
      const topFont = suggestions[0];
      const topScore = topFont ? (topFont.sizeKb < 50 ? 0.9 : 0.75) : 0.5;
      return textResponse(
        wrapDecision(payload, {
          decision: topFont
            ? `Recommended ${topFont.family} for ${context}`
            : `No fonts found for ${context}`,
          confidence: topScore,
          alternatives: suggestions.slice(1, 3).map((s) => ({
            option: s.family,
            tradeoff: s.reason,
          })),
          constraints: variableOnly ? ['variable fonts only'] : [],
          nextActions: topFont
            ? [
                {
                  tool: 'fetchtype_pair',
                  description: `Get pairings for ${topFont.family}`,
                  suggestedArgs: { font: topFont.family },
                },
              ]
            : [],
        }),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_init',
    'Get a starter token set, optionally from a named preset',
    { preset: z.string().optional(), prompt: z.string().optional() },
    async (args) => {
      const preset = typeof args.preset === 'string' ? args.preset : undefined;
      const prompt = typeof args.prompt === 'string' ? args.prompt : undefined;

      if (prompt && !preset) {
        const result = resolvePromptToTokenSet(prompt);
        const promptPayload = formatAgentInitPayload({
          tokenSet: result.tokenSet,
          reasoning: result.reasoning,
          recommendedReferences: result.recommendedReferences,
          source: 'prompt',
          prompt,
        });
        return textResponse(
          wrapDecision(promptPayload, {
            decision: `Created token set from prompt: "${prompt}"`,
            confidence: 0.8,
            alternatives: [],
            constraints: [],
            nextActions: [
              { tool: 'fetchtype_validate', description: 'Validate the generated token set' },
            ],
          }),
        );
      }

      const tokenSet = preset ? getPreset(preset) : getPreset('base');
      if (!tokenSet) {
        return textResponse(
          `Unknown preset "${preset}". Available: ${PRESET_NAMES.join(', ')}`,
          true,
        );
      }
      const referenceReport = validateDesignTokenSet(tokenSet, {
        referenceSystems: ['auto'],
      });
      const presetPayload = formatAgentInitPayload({
        tokenSet,
        reasoning: preset ? `Using preset "${preset}".` : 'Using default base preset.',
        recommendedReferences: (referenceReport.references ?? []).map((reference) => ({
          referenceId: reference.referenceId,
          referenceName: reference.referenceName,
          score: reference.score,
        })),
        source: preset ? 'preset' : 'default',
        ...(preset ? { preset } : {}),
      });
      return textResponse(
        wrapDecision(presetPayload, {
          decision: `Created token set from ${preset ? `preset "${preset}"` : 'default base preset'}`,
          confidence: 0.9,
          alternatives: [],
          constraints: [],
          nextActions: [
            { tool: 'fetchtype_validate', description: 'Validate the generated token set' },
          ],
        }),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_presets',
    'List available fetchtype presets',
    {},
    async () => {
      const presetList = PRESET_NAMES.map((name) => ({
        name,
        description: getPresetDescription(name),
      }));
      return textResponse(JSON.stringify(presetList, null, 2));
    },
  );

  registerTool(
    server,
    'fetchtype_systems',
    'Query curated typography systems, associated keywords, and extracted cross-system patterns',
    {
      query: z.string().optional(),
      useCase: z.string().optional(),
      style: z.string().optional(),
      kind: z
        .enum(['all', 'official-design-system', 'foundational-archetype'])
        .optional(),
      includePatterns: z.boolean().optional(),
    },
    async (args) => {
      const query = typeof args.query === 'string' ? args.query : undefined;
      const useCase = typeof args.useCase === 'string' ? args.useCase : undefined;
      const style = typeof args.style === 'string' ? args.style : undefined;
      const kind =
        args.kind === 'all' ||
        args.kind === 'official-design-system' ||
        args.kind === 'foundational-archetype'
          ? args.kind
          : undefined;
      const includePatterns =
        typeof args.includePatterns === 'boolean' ? args.includePatterns : undefined;
      const result = queryTypographySystems({
        query,
        useCase,
        style,
        kind: kind ?? 'all',
        includePatterns: includePatterns ?? true,
      });

      return textResponse(
        JSON.stringify(
          formatAgentSystemsPayload(result, {
            ...(query ? { text: query } : {}),
            ...(useCase ? { useCase } : {}),
            ...(style ? { style } : {}),
            kind: kind ?? 'all',
          }),
          null,
          2,
        ),
      );
    },
  );

  // ── Registry tools (Phase 1) ──

  registerTool(
    server,
    'fetchtype_resolve',
    'Resolve a font from the registry. Returns full metadata including install paths, metrics, and classification.',
    {
      font: z.string().describe('Font family name or ID (e.g. "inter", "Roboto")'),
    },
    async (args) => {
      const font = typeof args.font === 'string' ? args.font : '';
      const entry = resolveFont(font);
      if (!entry) {
        return textResponse(`Font "${font}" not found in registry. Use fetchtype_search to find available fonts.`, true);
      }
      return textResponse(JSON.stringify(entry, null, 2));
    },
  );

  registerTool(
    server,
    'fetchtype_pair',
    'Get font pairing recommendations. Returns curated and algorithmic pairings with confidence scores.',
    {
      font: z.string().describe('Font family name or ID to get pairings for'),
      role: z.enum(['heading', 'body', 'accent', 'mono']).optional().describe('Filter by pairing role'),
      limit: z.number().optional().describe('Max number of recommendations (default: 5)'),
    },
    async (args) => {
      const font = typeof args.font === 'string' ? args.font : '';
      const role = args.role as 'heading' | 'body' | 'accent' | 'mono' | undefined;
      const limit = typeof args.limit === 'number' ? args.limit : 5;

      const entry = resolveFont(font);
      if (!entry) {
        return textResponse(`Font "${font}" not found in registry.`, true);
      }

      const pairings = recommendPairings(font, { role, limit });
      const topPairing = pairings[0];
      const pairingPayload = {
        font: { id: entry.id, family: entry.family },
        pairings,
        nextCommands: pairings.slice(0, 2).map((p) => `fetchtype resolve ${p.fontId} --fallback`),
      };
      return textResponse(
        wrapDecision(pairingPayload, {
          decision: topPairing
            ? `Use ${topPairing.fontId} with ${entry.family}`
            : `No pairings found for ${entry.family}`,
          confidence: topPairing ? topPairing.confidence : 0.5,
          alternatives: pairings.slice(1, 3).map((p) => ({
            option: p.fontId,
            tradeoff: p.rationale ?? 'Alternative pairing option',
          })),
          constraints: role ? [`role filter: ${role}`] : [],
          nextActions: [
            {
              tool: 'fetchtype_validate',
              description: 'Validate token set with selected fonts',
            },
          ],
        }),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_fallback',
    'Generate platform-aware fallback CSS with metric overrides for CLS-free font loading across Windows, Apple, Android, Linux.',
    {
      font: z.string().describe('Font family name or ID'),
      compact: z.boolean().optional().describe('Use single @font-face instead of per-platform (less precise, smaller CSS)'),
      safariWrap: z.boolean().optional().describe('Wrap in @supports to exclude Safari (default: true)'),
    },
    async (args) => {
      const font = typeof args.font === 'string' ? args.font : '';
      const compact = typeof args.compact === 'boolean' ? args.compact : false;
      const safariWrap = typeof args.safariWrap === 'boolean' ? args.safariWrap : true;

      const entry = resolveFont(font);
      if (!entry) {
        return textResponse(`Font "${font}" not found in registry.`, true);
      }

      const css = generateFallbackCSS(entry, { compact, safariWrap, includeStack: true });
      return textResponse(css);
    },
  );

  registerTool(
    server,
    'fetchtype_prepare',
    'Download and optimize a font for production use. Generates WOFF2 files, @font-face CSS, fallback CSS, preload tags, and manifest.',
    {
      fontId: z.string().describe('Font ID from registry (e.g. "inter", "roboto")'),
      weights: z.array(z.number()).optional().describe('Weights to include (default: [400, 500, 700])'),
      subsets: z.array(z.string()).optional().describe('Subsets (default: ["latin"])'),
      outputDir: z.string().optional().describe('Output directory (default: "./dist/fonts")'),
      fontDisplay: z.enum(['swap', 'block', 'fallback', 'optional', 'auto']).optional().describe('font-display strategy (default: swap)'),
      generateFallbacks: z.boolean().optional().describe('Generate fallback CSS (default: true)'),
      performanceBudget: z.number().optional().describe('Budget in bytes (default: 150000)'),
      tokenFile: z.string().optional().describe('Token file to update with font reference'),
    },
    async (args) => {
      const fontId = typeof args.fontId === 'string' ? args.fontId : '';
      if (!fontId) {
        return textResponse('fontId is required.', true);
      }

      const weights = Array.isArray(args.weights) ? (args.weights as number[]) : undefined;
      const subsets = Array.isArray(args.subsets) ? (args.subsets as string[]) : undefined;
      const outputDir = typeof args.outputDir === 'string' ? args.outputDir : './dist/fonts';
      const fontDisplay = typeof args.fontDisplay === 'string'
        ? (args.fontDisplay as 'swap' | 'block' | 'fallback' | 'optional' | 'auto')
        : 'swap';
      const generateFallbacks = typeof args.generateFallbacks === 'boolean' ? args.generateFallbacks : true;
      const performanceBudget = typeof args.performanceBudget === 'number' ? args.performanceBudget : 150000;
      const tokenFile = typeof args.tokenFile === 'string' ? args.tokenFile : undefined;

      try {
        const manifest = await prepareFont({
          fontId,
          weights,
          subsets,
          outputDir,
          fontDisplay,
          generateFallbacks,
          performanceBudget,
          tokenFile,
        });

        return textResponse(
          JSON.stringify(
            {
              format: 'fetchtype-prepare/v1',
              fontId: manifest.fontId,
              family: manifest.family,
              version: manifest.version,
              outputDir,
              files: manifest.files.map((f) => ({
                path: f.path,
                weight: f.weight,
                style: f.style,
                subset: f.subset,
                format: f.format,
                sizeKb: Number((f.size / 1024).toFixed(1)),
              })),
              performance: manifest.performance,
              preloadTags: manifest.preloadTags,
              tokenPatch: manifest.tokenPatch ?? null,
              nextCommands: [
                `# Add to your HTML <head>:`,
                ...manifest.preloadTags,
                `# Import the CSS:`,
                `@import '${outputDir}/font-face.css';`,
                `@import '${outputDir}/fallback.css';`,
              ],
            },
            null,
            2,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return textResponse(`fetchtype_prepare failed: ${message}`, true);
      }
    },
  );

  registerTool(
    server,
    'fetchtype_search',
    'Search the font registry with free-text and filters. Returns matching fonts with metadata.',
    {
      query: z.string().optional().describe('Free-text search (matches family name, tags, category)'),
      context: z.enum(['display', 'interface', 'reading', 'mono', 'editorial', 'data']).optional(),
      category: z.enum(['sans-serif', 'serif', 'monospace', 'display', 'handwriting']).optional(),
      variable: z.boolean().optional().describe('Only variable fonts'),
      subset: z.string().optional().describe('Filter by subset support (e.g. "cyrillic")'),
      maxPayload: z.number().optional().describe('Maximum estimated payload in bytes'),
      limit: z.number().optional().describe('Max results (default: 20)'),
    },
    async (args) => {
      const results = searchRegistry({
        query: typeof args.query === 'string' ? args.query : undefined,
        context: args.context as any,
        category: args.category as any,
        variable: typeof args.variable === 'boolean' ? args.variable : undefined,
        subset: typeof args.subset === 'string' ? args.subset : undefined,
        maxPayload: typeof args.maxPayload === 'number' ? args.maxPayload : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 20,
      });

      const stats = registryStats();
      return textResponse(JSON.stringify({
        registry: { count: stats.count, variableCount: stats.variableCount },
        results: results.map(f => ({
          id: f.id,
          family: f.family,
          category: f.category,
          variable: f.variable,
          weights: f.weights,
          contexts: f.contexts,
          estimatedPayload: f.performance.estimatedPayload,
          loadingImpact: f.performance.loadingImpact,
          source: f.source,
          install: f.install.fontsource ?? f.install.googleCdn ?? null,
        })),
        count: results.length,
      }, null, 2));
    },
  );

  registerTool(
    server,
    'fetchtype_audit',
    'Audit a directory or file content for typography issues. Use to self-audit generated code.',
    {
      dir: z.string().optional().describe('Directory path to audit'),
      content: z.string().optional().describe('CSS/HTML content to audit inline (for self-audit)'),
      format: z.enum(['json', 'summary']).optional().describe('Output format (default: summary)'),
    },
    async (args) => {
      const dir = typeof args.dir === 'string' ? args.dir : undefined;
      const content = typeof args.content === 'string' ? args.content : undefined;
      const format = args.format === 'json' || args.format === 'summary' ? args.format : 'summary';

      if (!dir && !content) {
        return textResponse('Provide either "dir" (directory path) or "content" (inline CSS/HTML) to audit.', true);
      }

      if (dir && content) {
        return textResponse('Provide either "dir" or "content", not both.', true);
      }

      let auditDir: string;
      let tempPath: string | undefined;

      if (content) {
        // Write inline content to a temp file, audit it, then clean up
        const { mkdtemp, writeFile: wf, rm: _rm } = await import('node:fs/promises');
        const { tmpdir } = await import('node:os');
        const { join } = await import('node:path');

        const tmpDir = await mkdtemp(join(tmpdir(), 'fetchtype-mcp-audit-'));
        tempPath = tmpDir;

        // Detect content type from a simple heuristic
        const isHtml = /<html|<!DOCTYPE|<link|<style/i.test(content);
        const fileName = isHtml ? 'inline.html' : 'inline.css';
        await wf(join(tmpDir, fileName), content, 'utf8');
        auditDir = tmpDir;
      } else {
        auditDir = dir!;
      }

      try {
        const result = await auditDirectory(auditDir);

        let output: string;
        if (format === 'json') {
          output = JSON.stringify(result, null, 2);
        } else {
          const report = formatAuditReport(result);
          const errorCount = result.issues.filter((i) => i.severity === 'error').length;
          const warnCount = result.issues.filter((i) => i.severity === 'warning').length;
          output = `${report}\nSelf-audit complete: ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}.`;
        }

        return textResponse(output, result.issues.some((i) => i.severity === 'error'));
      } finally {
        if (tempPath) {
          const { rm } = await import('node:fs/promises');
          await rm(tempPath, { recursive: true, force: true });
        }
      }
    },
  );

  // ── Meta-tool: fetchtype_workflow ──

  registerTool(
    server,
    'fetchtype_workflow',
    'Plan a complete typography workflow. Returns ordered sequence of fetchtype tools to call.',
    {
      goal: z.string().describe(
        'What you want to achieve, e.g., "set up typography for a SaaS dashboard"',
      ),
    },
    async (args) => {
      const goal = typeof args.goal === 'string' ? args.goal : '';
      const lowerGoal = goal.toLowerCase();

      type WorkflowKey = 'setup' | 'audit' | 'build' | 'fonts';

      type WorkflowStep = {
        tool: string;
        description: string;
        suggestedArgs?: Record<string, unknown>;
      };

      const workflowDefinitions: Record<WorkflowKey, WorkflowStep[]> = {
        setup: [
          { tool: 'fetchtype_suggest', description: 'Find fonts for your context' },
          { tool: 'fetchtype_pair', description: 'Get curated font pairings' },
          { tool: 'fetchtype_init', description: 'Generate a starter token set' },
          { tool: 'fetchtype_validate', description: 'Validate the token set' },
          { tool: 'fetchtype_build', description: 'Build CSS/JSON/Tailwind artifacts' },
        ],
        audit: [
          { tool: 'fetchtype_audit', description: 'Audit existing typography for issues' },
          { tool: 'fetchtype_validate', description: 'Validate token set against rules' },
        ],
        build: [
          { tool: 'fetchtype_validate', description: 'Validate before building' },
          { tool: 'fetchtype_build', description: 'Build artifacts' },
          { tool: 'fetchtype_prepare', description: 'Prepare fonts for production' },
        ],
        fonts: [
          { tool: 'fetchtype_suggest', description: 'Find candidate fonts' },
          { tool: 'fetchtype_pair', description: 'Get pairing recommendations' },
          { tool: 'fetchtype_resolve', description: 'Resolve font metadata' },
        ],
      };

      let matchedKey: WorkflowKey;
      let matchedWorkflow: WorkflowStep[];

      if (
        lowerGoal.includes('audit') ||
        lowerGoal.includes('check') ||
        lowerGoal.includes('review')
      ) {
        matchedKey = 'audit';
      } else if (
        lowerGoal.includes('build') ||
        lowerGoal.includes('export') ||
        lowerGoal.includes('compile')
      ) {
        matchedKey = 'build';
      } else if (
        lowerGoal.includes('font') ||
        lowerGoal.includes('pairing') ||
        lowerGoal.includes('typeface')
      ) {
        matchedKey = 'fonts';
      } else {
        // Default to full setup workflow for goals like "set up", "create", "new project"
        matchedKey = 'setup';
      }

      matchedWorkflow = workflowDefinitions[matchedKey];

      const responsePayload = {
        goal,
        workflow: matchedKey,
        steps: matchedWorkflow.map((step, index) => ({
          step: index + 1,
          ...step,
        })),
        description: `${matchedWorkflow.length}-step workflow for: ${goal}`,
      };

      return textResponse(
        wrapDecision(responsePayload, {
          decision: `Use the "${matchedKey}" workflow for: ${goal}`,
          confidence: 0.85,
          alternatives: (Object.keys(workflowDefinitions) as WorkflowKey[])
            .filter((key) => key !== matchedKey)
            .slice(0, 2)
            .map((key) => ({
              option: key,
              tradeoff: `${workflowDefinitions[key].length} steps — suited for ${key} goals`,
            })),
          constraints: [],
          nextActions: matchedWorkflow.slice(0, 1).map((step) => ({
            tool: step.tool,
            description: `Start with: ${step.description}`,
          })),
        }),
      );
    },
  );

  registerTool(
    server,
    'fetchtype_generate',
    'Generate a complete, validated token set from context and constraints. One call, one output.',
    {
      context: z.string().describe('Target context: saas-dashboard, editorial, ecommerce, docs, marketing'),
      brandColor: z.string().optional().describe('Primary brand color hex, e.g., #2563eb'),
      preset: z.string().optional().describe('Explicit preset name to use as base'),
    },
    ({ context, brandColor, preset }) => {
      const result = generateTokenSet({
        context: String(context),
        brandColor: brandColor !== undefined ? String(brandColor) : undefined,
        preset: preset !== undefined ? String(preset) : undefined,
      });

      return textResponse(
        wrapDecision(result, {
          decision: `Generated ${String(context)} token set`,
          confidence: result.warnings.length === 0 ? 0.95 : 0.7,
          alternatives: [],
          constraints: result.warnings,
          nextActions: [{ tool: 'fetchtype_validate', description: 'Validate the generated token set' }],
        }),
      );
    },
  );

  return server;
}

function getPresetDescription(name: string): string {
  const descriptions: Record<string, string> = {
    base: 'Clean sans-serif foundation with Inter. Good starting point for most projects.',
    editorial: 'Serif-forward layout optimized for long-form reading and articles.',
    dashboard: 'Compact, data-dense typography for admin panels and analytics.',
    ecommerce: 'Product-focused hierarchy with clear pricing and CTA typography.',
    docs: 'Technical documentation layout with strong code and prose support.',
  };
  return descriptions[name] ?? 'No description available.';
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
