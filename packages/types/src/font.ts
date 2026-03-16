import { z } from 'zod';

// -- Font source types --

export const FontSourceSchema = z.enum(['google', 'self-hosted', 'custom', 'generated']);
export type FontSource = z.infer<typeof FontSourceSchema>;

export const FontLicenseSchema = z.object({
  type: z.enum(['ofl', 'apache2', 'proprietary', 'custom', 'derivative']),
  name: z.string(),
  url: z.string().url().optional(),
  restrictions: z
    .object({
      domains: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
      redistribution: z.boolean().optional(),
      modification: z.boolean().optional(),
    })
    .optional(),
});
export type FontLicense = z.infer<typeof FontLicenseSchema>;

export const FontAxisSchema = z.object({
  min: z.number(),
  max: z.number(),
  default: z.number(),
});
export type FontAxis = z.infer<typeof FontAxisSchema>;

// -- Font reference: pointer to a font in the library --

export const FontReferenceSchema = z.object({
  family: z.string(),
  source: FontSourceSchema,
  variable: z.boolean().default(false),
  axes: z.record(z.string(), FontAxisSchema).optional(),
  license: FontLicenseSchema.optional(),
  category: z.enum(['sans-serif', 'serif', 'monospace', 'display', 'handwriting']).optional(),
  fallbacks: z.array(z.string()).optional(),
});
export type FontReference = z.infer<typeof FontReferenceSchema>;

// -- Font intent: what the font is for --

export const FontIntentSchema = z.enum(['heading', 'body', 'ui', 'data', 'display', 'code']);
export type FontIntent = z.infer<typeof FontIntentSchema>;

// -- Font spec: the AI-produced font selection --

export const FontSpecSchema = z.object({
  primary: FontReferenceSchema,
  secondary: FontReferenceSchema.optional(),
  mono: FontReferenceSchema.optional(),
  weights: z.array(z.number().min(1).max(1000)),
  opticalSizes: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  intent: FontIntentSchema,
});
export type FontSpec = z.infer<typeof FontSpecSchema>;

// -- Font metadata: used for library indexing + search --

export const FontMoodSchema = z.enum([
  'modern',
  'classic',
  'playful',
  'serious',
  'elegant',
  'technical',
  'friendly',
  'bold',
  'minimal',
  'warm',
  'cold',
  'luxury',
  'casual',
  'formal',
]);
export type FontMood = z.infer<typeof FontMoodSchema>;

export const FontMetadataSchema = z.object({
  family: z.string(),
  source: FontSourceSchema,
  category: z.enum(['sans-serif', 'serif', 'monospace', 'display', 'handwriting']),
  variable: z.boolean(),
  axes: z.record(z.string(), FontAxisSchema).optional(),
  weights: z.array(z.number()),
  subsets: z.array(z.string()),
  moods: z.array(FontMoodSchema),
  readabilityScore: z.number().min(0).max(1),
  license: FontLicenseSchema,
  popularityRank: z.number().optional(),
  pairingHints: z.array(z.string()).optional(),
});
export type FontMetadata = z.infer<typeof FontMetadataSchema>;

// -- Font asset: the actual deliverable --

export const FontFormatSchema = z.enum(['woff2', 'woff', 'ttf', 'otf', 'variable']);
export type FontFormat = z.infer<typeof FontFormatSchema>;

export const FontAssetSchema = z.object({
  family: z.string(),
  weight: z.number().optional(),
  style: z.enum(['normal', 'italic']).default('normal'),
  format: FontFormatSchema,
  url: z.string(),
  subset: z.string().optional(),
  unicodeRange: z.string().optional(),
  sizeBytes: z.number().optional(),
});
export type FontAsset = z.infer<typeof FontAssetSchema>;
