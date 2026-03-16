import { z } from 'zod';

import { SeveritySchema } from './validation.js';

// -- Config schema --

export const ExportFormatSchema = z.enum(['css', 'json', 'tailwind', 'shadcn', 'w3c']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const RuleConfigSchema = z.union([
  SeveritySchema, // Just set severity: "error" | "warning" | "info"
  z.literal(false), // Disable the rule
  z.object({
    severity: SeveritySchema,
    options: z.record(z.string(), z.unknown()).optional(),
  }),
]);
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

export const FetchTypeConfigSchema = z.object({
  // Extend a built-in profile or npm package config
  extends: z.union([z.string(), z.array(z.string())]).optional(),

  // Base preset to use (editorial, dashboard, etc.)
  preset: z.string().optional(),

  // Token file glob pattern(s)
  tokens: z.union([z.string(), z.array(z.string())]).default('tokens/**/*.json'),

  // Output directory
  outDir: z.string().default('dist/tokens'),

  // Export formats to produce
  exporters: z.array(ExportFormatSchema).default(['css', 'json']),

  // Theme settings
  themes: z
    .object({
      default: z.string().default('light'),
    })
    .default({}),

  // Validation rule configuration
  rules: z.record(z.string(), RuleConfigSchema).default({}),

  // Font policy
  fonts: z
    .object({
      allow: z.array(z.string()).optional(), // Only these fonts allowed
      block: z
        .array(
          z.union([
            z.string(),
            z.object({ family: z.string(), reason: z.string() }),
          ]),
        )
        .optional(), // These fonts blocked with reasons
      googleFontsApiKey: z.string().optional(),
      cacheDir: z.string().default('.fetchtype/fonts'),
    })
    .default({}),

  // Performance budgets
  performance: z
    .object({
      maxFontPayloadKb: z.number().optional(),
      maxFontCount: z.number().optional(),
      maxPreloadCount: z.number().optional(),
    })
    .default({}),

  // Required subsets for locale coverage
  requiredSubsets: z.array(z.string()).optional(),

  // Plugin packages (future)
  plugins: z.array(z.string()).default([]),
});
export type FetchTypeConfig = z.infer<typeof FetchTypeConfigSchema>;
