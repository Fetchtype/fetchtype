import { z } from 'zod';

// -- Typography context: what the text is used for --

export const TypographyContextSchema = z.enum([
  'heading',
  'subheading',
  'body',
  'caption',
  'button',
  'label',
  'input',
  'chart-label',
  'chart-axis',
  'chart-title',
  'code',
  'blockquote',
]);
export type TypographyContext = z.infer<typeof TypographyContextSchema>;

export const TokenReferenceSchema = z.string().regex(/^\{[A-Za-z0-9_.-]+\}$/);
export type TokenReference = z.infer<typeof TokenReferenceSchema>;

// -- Individual token types (W3C DTCG compatible) --

export const TypographyTokenSchema = z.object({
  fontFamily: z.union([z.string(), z.array(z.string())]),
  fontSize: z.string(),
  fontWeight: z.union([z.number(), z.string()]),
  lineHeight: z.union([z.string(), z.number()]),
  letterSpacing: z.string().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
});
export type TypographyToken = z.infer<typeof TypographyTokenSchema>;

export const ColorTokenSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});
export type ColorToken = z.infer<typeof ColorTokenSchema>;

export const ColorTokensSchema = z.object({
  text: z.object({
    primary: ColorTokenSchema,
    secondary: ColorTokenSchema,
    muted: ColorTokenSchema,
    accent: ColorTokenSchema,
    inverse: ColorTokenSchema,
  }),
  background: z.object({
    primary: ColorTokenSchema,
    secondary: ColorTokenSchema,
    accent: ColorTokenSchema,
    muted: ColorTokenSchema,
  }),
  border: z.object({
    default: ColorTokenSchema,
    muted: ColorTokenSchema,
    accent: ColorTokenSchema,
  }),
  interactive: z.object({
    default: ColorTokenSchema,
    hover: ColorTokenSchema,
    active: ColorTokenSchema,
    focus: ColorTokenSchema,
    disabled: ColorTokenSchema,
  }),
});
export type ColorTokens = z.infer<typeof ColorTokensSchema>;

export const SpacingTokensSchema = z.object({
  unit: z.string(),
  scale: z.record(z.string(), z.string()),
});
export type SpacingTokens = z.infer<typeof SpacingTokensSchema>;

export const LayoutTokensSchema = z.object({
  maxWidth: z.object({
    prose: z.string(),
    content: z.string(),
    wide: z.string(),
    full: z.string(),
  }),
  breakpoints: z.record(z.string(), z.string()),
  grid: z
    .object({
      columns: z.number(),
      gap: z.string(),
    })
    .optional(),
});
export type LayoutTokens = z.infer<typeof LayoutTokensSchema>;

// -- Hierarchy: the type scale and emphasis rules --

export const HeadingLevelSchema = z.object({
  fontSize: z.string(),
  fontWeight: z.union([z.number(), z.string()]),
  lineHeight: z.union([z.string(), z.number()]),
  letterSpacing: z.string().optional(),
  fontFamily: z.union([z.string(), z.array(z.string())]).optional(),
});
export type HeadingLevel = z.infer<typeof HeadingLevelSchema>;

export const HierarchyRulesSchema = z.object({
  scale: z.enum(['minor-second', 'major-second', 'minor-third', 'major-third', 'perfect-fourth']),
  baseSize: z.string(),
  headings: z.object({
    h1: HeadingLevelSchema,
    h2: HeadingLevelSchema,
    h3: HeadingLevelSchema,
    h4: HeadingLevelSchema,
    h5: HeadingLevelSchema,
    h6: HeadingLevelSchema,
  }),
  emphasis: z.object({
    strong: z.object({ fontWeight: z.union([z.number(), z.string()]) }),
    subtle: z.object({ opacity: z.number(), fontSize: z.string().optional() }),
  }),
});
export type HierarchyRules = z.infer<typeof HierarchyRulesSchema>;

// -- The complete design token set --

export const DesignTokenSetSchema = z.object({
  typography: z.record(TypographyContextSchema, TypographyTokenSchema),
  color: z.object({
    light: ColorTokensSchema,
    dark: ColorTokensSchema,
  }),
  spacing: SpacingTokensSchema,
  layout: LayoutTokensSchema,
  hierarchy: HierarchyRulesSchema,
  themes: z.array(z.lazy(() => ThemeModeSchema)).default([]),
  modes: z.record(z.string(), z.lazy(() => ModeOverrideSchema)).default({}),
  /** Optional: required font subsets for locale/script coverage validation. */
  requiredSubsets: z.array(z.string()).optional(),
  /** Optional: font-display strategy for font loading validation. */
  fontDisplay: z.enum(['auto', 'block', 'swap', 'fallback', 'optional']).optional(),
});
export type DesignTokenSet = z.infer<typeof DesignTokenSetSchema>;

// -- Mode: a named typography/layout override --

export const ModeOverrideSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tokens: z.record(z.string(), z.unknown()).default({}),
});
export type ModeOverride = z.infer<typeof ModeOverrideSchema>;

// -- Theme: a named set of token overrides --

export const ThemeColorSchemeSchema = z.enum(['light', 'dark', 'auto', 'brand', 'high-contrast']);
export type ThemeColorScheme = z.infer<typeof ThemeColorSchemeSchema>;

export const ThemeModeSchema = z.object({
  name: z.string(),
  colorScheme: ThemeColorSchemeSchema,
  selector: z.string().optional(),
  tokens: z.record(z.string(), z.unknown()).default({}),
});
export type ThemeMode = z.infer<typeof ThemeModeSchema>;
