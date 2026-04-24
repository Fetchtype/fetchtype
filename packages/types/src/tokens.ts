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

// -- Motion tokens: durations, easings, springs, presets, interpolations --

export const SpringConfigSchema = z.object({
  stiffness: z.number(),
  damping: z.number(),
  mass: z.number().default(1),
});
export type SpringConfig = z.infer<typeof SpringConfigSchema>;

export const MotionPresetSchema = z.object({
  property: z.string(),
  from: z.union([z.string(), z.number()]),
  to: z.union([z.string(), z.number()]),
  duration: z.string().optional(),
  easing: z.string().optional(),
});
export type MotionPreset = z.infer<typeof MotionPresetSchema>;

export const InterpolationSchema = z.object({
  input: z.enum(['scroll', 'mouseX', 'mouseY', 'mouseDistance', 'time', 'frame']),
  inputRange: z.array(z.union([z.number(), z.string()])),
  outputRange: z.array(z.union([z.number(), z.string()])),
  easing: z.string().optional(),
  loop: z.boolean().optional(),
});
export type Interpolation = z.infer<typeof InterpolationSchema>;

export const MotionTokensSchema = z.object({
  duration: z.record(z.string(), z.string()).optional(),
  easing: z.record(z.string(), z.string()).optional(),
  spring: z.record(z.string(), SpringConfigSchema).optional(),
  preset: z.record(z.string(), MotionPresetSchema).optional(),
  interpolation: z.record(z.string(), InterpolationSchema).optional(),
});
export type MotionTokens = z.infer<typeof MotionTokensSchema>;

// -- Timeline tokens: frame-based compositions and sequences --

export const TimelineSequenceSchema = z.object({
  name: z.string(),
  from: z.number(),
  durationInFrames: z.number(),
  animation: z.string().optional(),
  stagger: z.union([z.number(), z.string()]).optional(),
});
export type TimelineSequence = z.infer<typeof TimelineSequenceSchema>;

export const TimelineCompositionSchema = z.object({
  width: z.number(),
  height: z.number(),
  durationInFrames: z.number(),
  fps: z.number().optional(),
  params: z.record(z.string(), z.string()).optional(),
  sequences: z.array(TimelineSequenceSchema).optional(),
});
export type TimelineComposition = z.infer<typeof TimelineCompositionSchema>;

export const TimelineTokensSchema = z.object({
  fps: z.number().default(30),
  compositions: z.record(z.string(), TimelineCompositionSchema).optional(),
});
export type TimelineTokens = z.infer<typeof TimelineTokensSchema>;

// -- Layer tokens: spatial canvas with effects and interaction drivers --

export const LayerEffectSchema = z.object({
  type: z.string(),
  intensity: z.number().optional(),
  scale: z.number().optional(),
  radius: z.string().optional(),
  color: z.string().optional(),
  mask: z.string().optional(),
});
export type LayerEffect = z.infer<typeof LayerEffectSchema>;

export const LayerInteractionSchema = z.object({
  property: z.string(),
  intensity: z.number().optional(),
  smoothing: z.number().optional(),
  inputRange: z.array(z.union([z.number(), z.string()])).optional(),
  outputRange: z.array(z.union([z.number(), z.string()])).optional(),
});
export type LayerInteraction = z.infer<typeof LayerInteractionSchema>;

export const LayerSchema = z.object({
  type: z.enum(['image', 'shape', 'text', 'video', '3d-model']),
  z: z.number(),
  effects: z.array(LayerEffectSchema).optional(),
  interactions: z.record(z.string(), LayerInteractionSchema).optional(),
  material: z.string().optional(),
  typography: z.string().optional(),
  color: z.string().optional(),
});
export type Layer = z.infer<typeof LayerSchema>;

export const LayerTokensSchema = z.record(z.string(), LayerSchema);
export type LayerTokens = z.infer<typeof LayerTokensSchema>;

// -- Scene tokens: 3D camera, lighting, materials, environment --

export const CameraConfigSchema = z.object({
  type: z.enum(['perspective', 'orthographic']),
  fov: z.number().optional(),
  near: z.number().optional(),
  far: z.number().optional(),
  position: z.array(z.number()).optional(),
  zoom: z.number().optional(),
});
export type CameraConfig = z.infer<typeof CameraConfigSchema>;

export const LightConfigSchema = z.object({
  type: z.enum(['ambient', 'directional', 'point', 'spot']).optional(),
  color: z.string(),
  intensity: z.number(),
  position: z.array(z.number()).optional(),
});
export type LightConfig = z.infer<typeof LightConfigSchema>;

export const MaterialConfigSchema = z.object({
  type: z.enum(['physical', 'standard', 'toon', 'basic']),
  color: z.string(),
  roughness: z.number().optional(),
  metalness: z.number().optional(),
  transmission: z.number().optional(),
  thickness: z.number().optional(),
});
export type MaterialConfig = z.infer<typeof MaterialConfigSchema>;

export const FogConfigSchema = z.object({
  color: z.string(),
  near: z.number(),
  far: z.number(),
});
export type FogConfig = z.infer<typeof FogConfigSchema>;

export const EnvironmentConfigSchema = z.object({
  background: z.string(),
  fog: FogConfigSchema.optional(),
});
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export const SceneTokensSchema = z.object({
  camera: z.record(z.string(), CameraConfigSchema).optional(),
  lighting: z.record(z.string(), z.record(z.string(), LightConfigSchema)).optional(),
  materials: z.record(z.string(), MaterialConfigSchema).optional(),
  environment: z.record(z.string(), EnvironmentConfigSchema).optional(),
});
export type SceneTokens = z.infer<typeof SceneTokensSchema>;

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
  /** Optional: motion tokens for animations, transitions, and springs. */
  motion: MotionTokensSchema.optional(),
  /** Optional: timeline tokens for frame-based compositions. */
  timeline: TimelineTokensSchema.optional(),
  /** Optional: spatial layer stack with effects and interaction drivers. */
  layers: LayerTokensSchema.optional(),
  /** Optional: 3D scene tokens for camera, lighting, materials, environment. */
  scenes: SceneTokensSchema.optional(),
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
