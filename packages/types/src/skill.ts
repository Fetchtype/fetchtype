import type { FontSpec } from './font.js';
import type { DesignTokenSet, TypographyContext } from './tokens.js';
import type { ValidationReport } from './validation.js';
import type { DeliveryManifest } from './delivery.js';

// -- Skill interface: what AI agents call --

export type FetchTypeSkill = {
  describeFonts: (description: string) => Promise<FontSpec>;
  generateTokens: (font: FontSpec, contexts: TypographyContext[]) => DesignTokenSet;
  validate: (tokens: DesignTokenSet) => ValidationReport;
  build: (tokens: DesignTokenSet) => Promise<DeliveryManifest>;
  createDocument: (markdown: string, tokens: DesignTokenSet) => Promise<Uint8Array>;
};

// -- Font resolver: future CDN integration --

export type FontResolver = {
  resolve: (family: string, source: string) => Promise<FontSpec>;
  generateFontFace: (spec: FontSpec) => string;
};

// -- AI recommender: future AI integration --

export type BrandContext = {
  industry: string;
  tone: string[];
  audience: string;
  existingFonts?: string[];
};

export type FontPairing = {
  primary: FontSpec;
  secondary: FontSpec;
  confidence: number;
  reasoning: string;
};

export type AIRecommender = {
  pairFonts: (context: BrandContext) => Promise<FontPairing[]>;
  optimizeAxes: (family: string, context: TypographyContext) => Promise<Record<string, number>>;
};
