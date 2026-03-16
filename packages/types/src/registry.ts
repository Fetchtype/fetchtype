import { z } from 'zod';

// === Rendering Targets ===
// The correct abstraction for fallback computation: rendering engines, not platforms.
// Core Text (Apple), DirectWrite (Windows), FreeType (Android/Linux), Universal (Arial everywhere).

export const RenderingTargetSchema = z.enum([
  'apple',
  'windows',
  'android',
  'linux',
  'universal',
]);
export type RenderingTarget = z.infer<typeof RenderingTargetSchema>;

// === Typographic Context ===
// Where a font excels — distinct from token-level TypographyContext (heading/body/caption).

export const TypographicContextSchema = z.enum([
  'display',
  'interface',
  'reading',
  'mono',
  'editorial',
  'data',
]);
export type TypographicContext = z.infer<typeof TypographicContextSchema>;

// === Variable Axis ===

export const RegistryVariableAxisSchema = z.object({
  tag: z.string(),
  name: z.string(),
  min: z.number(),
  max: z.number(),
  default: z.number(),
  step: z.number(),
  cssProperty: z.string().nullable(),
});
export type RegistryVariableAxis = z.infer<typeof RegistryVariableAxisSchema>;

// === Fallback Target ===

export const FallbackOverridesSchema = z.object({
  ascentOverride: z.string(),
  descentOverride: z.string(),
  lineGapOverride: z.string(),
  sizeAdjust: z.string(),
});
export type FallbackOverrides = z.infer<typeof FallbackOverridesSchema>;

export const FallbackTargetSchema = z.object({
  target: RenderingTargetSchema,
  fallbackFont: z.string(),
  localNames: z.array(z.string()),
  overrides: FallbackOverridesSchema,
});
export type FallbackTarget = z.infer<typeof FallbackTargetSchema>;

// === Pairing Recommendation ===

export const PairingRoleSchema = z.enum(['heading', 'body', 'accent', 'mono']);
export type PairingRole = z.infer<typeof PairingRoleSchema>;

export const PairingRecommendationSchema = z.object({
  fontId: z.string(),
  role: PairingRoleSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  source: z.enum(['curated', 'algorithmic']).optional(),
});
export type PairingRecommendation = z.infer<typeof PairingRecommendationSchema>;

// === System Font Info ===

export const SystemFontInfoSchema = z.object({
  platforms: z.array(RenderingTargetSchema),
  localNames: z.array(z.string()),
  cssKeywords: z.array(z.string()),
  note: z.string().nullable(),
});
export type SystemFontInfo = z.infer<typeof SystemFontInfoSchema>;

// === Font Entry Performance ===

export const FontPerformanceSchema = z.object({
  woff2Size: z.record(z.string(), z.number()),
  variableFileSize: z.number().nullable(),
  estimatedPayload: z.number(),
  loadingImpact: z.enum(['minimal', 'moderate', 'heavy']),
});
export type FontPerformance = z.infer<typeof FontPerformanceSchema>;

// === Font Entry Metrics ===

export const FontMetricsSchema = z.object({
  unitsPerEm: z.number(),
  ascent: z.number(),
  descent: z.number(),
  lineGap: z.number(),
  xHeight: z.number().nullable(),
  capHeight: z.number().nullable(),
  useTypoMetrics: z.boolean(),
  hheaAscent: z.number().nullable(),
  hheaDescent: z.number().nullable(),
  winAscent: z.number().nullable(),
  winDescent: z.number().nullable(),
});
export type FontMetrics = z.infer<typeof FontMetricsSchema>;

// === Font Entry Fallback Intelligence ===

export const FontFallbackSchema = z.object({
  targets: z.array(FallbackTargetSchema),
  requiresPlatformSplit: z.boolean(),
  generatedCSS: z.string(),
});
export type FontFallback = z.infer<typeof FontFallbackSchema>;

// === Font Entry Pairing Intelligence ===

export const FontPairingIntelligenceSchema = z.object({
  recommended: z.array(PairingRecommendationSchema),
});
export type FontPairingIntelligence = z.infer<typeof FontPairingIntelligenceSchema>;

// === Font Entry License ===

export const RegistryLicenseSchema = z.object({
  type: z.string(),
  url: z.string(),
  commercial: z.boolean(),
  selfHostable: z.boolean(),
  attribution: z.string().nullable(),
});
export type RegistryLicense = z.infer<typeof RegistryLicenseSchema>;

// === Font Entry Install / Deployment ===

export const FontInstallSchema = z.object({
  fontsource: z.string().nullable(),
  googleCdn: z.string().nullable(),
  npmPackage: z.string().nullable(),
  system: SystemFontInfoSchema.nullable(),
});
export type FontInstall = z.infer<typeof FontInstallSchema>;

// === FontEntry — the core registry schema ===

export const FontEntrySchema = z.object({
  // Identity
  id: z.string(),
  family: z.string(),
  version: z.string(),
  source: z.enum(['google', 'fontsource', 'system', 'community']),
  lastUpdated: z.string(),

  // Classification
  category: z.enum(['sans-serif', 'serif', 'monospace', 'display', 'handwriting']),
  tags: z.array(z.string()),
  contexts: z.array(TypographicContextSchema),

  // Technical
  variable: z.boolean(),
  axes: z.array(RegistryVariableAxisSchema),
  weights: z.array(z.number()),
  styles: z.array(z.enum(['normal', 'italic'])),
  subsets: z.array(z.string()),
  formats: z.array(z.enum(['woff2', 'woff', 'ttf', 'otf'])),
  hasItalic: z.boolean(),
  hasOpticalSizing: z.boolean(),

  // Performance (enriched)
  performance: FontPerformanceSchema,

  // Rendering (enriched)
  metrics: FontMetricsSchema,

  // Fallback Intelligence (enriched)
  fallback: FontFallbackSchema,

  // Pairing Intelligence (enriched)
  pairing: FontPairingIntelligenceSchema,

  // Licensing
  license: RegistryLicenseSchema,

  // Deployment
  install: FontInstallSchema,

  // Context Intelligence (enriched)
  contextScores: z.record(z.string(), z.number()).optional(),

  // Size Guidance (enriched)
  sizeGuidance: z.object({
    body: z.object({ min: z.number(), optimal: z.number(), max: z.number() }),
    display: z.object({ min: z.number() }),
    caption: z.object({ min: z.number() }),
    opticalSizeMapping: z.array(z.object({
      cssSize: z.number(),
      opszValue: z.number(),
    })).nullable(),
  }).optional(),
});
export type FontEntry = z.infer<typeof FontEntrySchema>;

// === Registry (collection of FontEntry) ===

export const FontRegistrySchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  count: z.number(),
  fonts: z.array(FontEntrySchema),
});
export type FontRegistry = z.infer<typeof FontRegistrySchema>;
