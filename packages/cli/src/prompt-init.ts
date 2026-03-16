import {
  findBestTypographyReferences,
  getPreset,
} from '@fetchtype/core';
import type { DesignTokenSet } from '@fetchtype/types';

type PromptResult = {
  tokenSet: DesignTokenSet;
  reasoning: string;
  recommendedReferences: Array<{
    referenceId: string;
    referenceName: string;
    score: number;
  }>;
};

type PresetPattern = {
  preset: string;
  keywords: string[];
  label: string;
};

const PRESET_PATTERNS: PresetPattern[] = [
  { preset: 'dashboard', keywords: ['dashboard', 'admin', 'data', 'compact', 'dense', 'analytics'], label: 'dashboard' },
  { preset: 'editorial', keywords: ['editorial', 'blog', 'magazine', 'content', 'article', 'journal', 'news'], label: 'editorial' },
  { preset: 'docs', keywords: ['docs', 'documentation', 'technical', 'api', 'reference', 'guide'], label: 'docs' },
  { preset: 'ecommerce', keywords: ['ecommerce', 'shop', 'store', 'product', 'catalog', 'marketplace'], label: 'ecommerce' },
];

type Modifier = {
  keywords: string[];
  label: string;
  apply: (tokenSet: DesignTokenSet) => void;
};

const MODIFIERS: Modifier[] = [
  {
    keywords: ['traditional', 'classic', 'serif', 'elegant'],
    label: 'serif fonts',
    apply(tokenSet) {
      const serifStack = ['Georgia', 'Times New Roman', 'serif'];
      for (const key of Object.keys(tokenSet.typography)) {
        const ctx = key as keyof typeof tokenSet.typography;
        const typographyToken = tokenSet.typography[ctx];
        if (
          typographyToken &&
          !toFontFamilyArray(typographyToken.fontFamily).some(
            (fontFamily) => fontFamily === 'monospace' || fontFamily === 'ui-monospace',
          )
        ) {
          tokenSet.typography[ctx] = { ...typographyToken, fontFamily: serifStack };
        }
      }
      for (const level of Object.keys(tokenSet.hierarchy.headings)) {
        const heading = tokenSet.hierarchy.headings[level as keyof typeof tokenSet.hierarchy.headings];
        if (heading && typeof heading === 'object' && 'fontFamily' in heading) {
          (heading as { fontFamily: string[] }).fontFamily = serifStack;
        }
      }
    },
  },
  {
    keywords: ['compact', 'dense', 'small', 'tight'],
    label: 'compact sizing',
    apply(tokenSet) {
      tokenSet.spacing = {
        ...tokenSet.spacing,
        scale: {
          ...tokenSet.spacing.scale,
          lg: '0.75rem',
          xl: '1rem',
          '2xl': '1.5rem',
          '3xl': '2rem',
        },
      };
      if (tokenSet.typography.body) {
        tokenSet.typography.body = {
          ...tokenSet.typography.body,
          fontSize: '0.875rem',
          lineHeight: 1.4,
        };
      }
    },
  },
  {
    keywords: ['spacious', 'generous', 'airy', 'relaxed', 'open'],
    label: 'spacious layout',
    apply(tokenSet) {
      tokenSet.spacing = {
        ...tokenSet.spacing,
        scale: {
          ...tokenSet.spacing.scale,
          lg: '1.25rem',
          xl: '2rem',
          '2xl': '3rem',
          '3xl': '4rem',
        },
      };
      if (tokenSet.typography.body) {
        tokenSet.typography.body = {
          ...tokenSet.typography.body,
          lineHeight: 1.9,
        };
      }
    },
  },
  {
    keywords: ['high contrast', 'high-contrast', 'accessible', 'a11y'],
    label: 'high contrast colors',
    apply(tokenSet) {
      tokenSet.color.light.text.primary = { value: '#000000' };
      tokenSet.color.light.text.secondary = { value: '#1a1a1a' };
      tokenSet.color.light.background.primary = { value: '#ffffff' };
      tokenSet.color.dark.text.primary = { value: '#ffffff' };
      tokenSet.color.dark.text.secondary = { value: '#f0f0f0' };
      tokenSet.color.dark.background.primary = { value: '#000000' };
    },
  },
  {
    keywords: ['monospace', 'code', 'terminal', 'hacker'],
    label: 'monospace fonts',
    apply(tokenSet) {
      const monoStack = ['JetBrains Mono', 'ui-monospace', 'monospace'];
      for (const key of Object.keys(tokenSet.typography)) {
        const ctx = key as keyof typeof tokenSet.typography;
        if (tokenSet.typography[ctx]) {
          tokenSet.typography[ctx] = { ...tokenSet.typography[ctx], fontFamily: monoStack };
        }
      }
      for (const level of Object.keys(tokenSet.hierarchy.headings)) {
        const heading = tokenSet.hierarchy.headings[level as keyof typeof tokenSet.hierarchy.headings];
        if (heading && typeof heading === 'object' && 'fontFamily' in heading) {
          (heading as { fontFamily: string[] }).fontFamily = monoStack;
        }
      }
    },
  },
];

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim();
}

function toFontFamilyArray(fontFamily: string | string[]): string[] {
  return Array.isArray(fontFamily) ? fontFamily : fontFamily.split(',').map((value) => value.trim());
}

function detectPreset(prompt: string): { preset: string; reason: string } {
  const normalized = normalizePrompt(prompt);

  for (const pattern of PRESET_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        return {
          preset: pattern.preset,
          reason: `Matched "${keyword}" → ${pattern.label} preset`,
        };
      }
    }
  }

  return { preset: 'base', reason: 'No specific domain detected → base preset' };
}

function detectModifiers(prompt: string): { label: string; apply: (ts: DesignTokenSet) => void }[] {
  const normalized = normalizePrompt(prompt);
  const matched: { label: string; apply: (ts: DesignTokenSet) => void }[] = [];

  for (const modifier of MODIFIERS) {
    for (const keyword of modifier.keywords) {
      if (normalized.includes(keyword)) {
        matched.push({ label: modifier.label, apply: modifier.apply });
        break;
      }
    }
  }

  return matched;
}

export function resolvePromptToTokenSet(prompt: string): PromptResult {
  const { preset, reason } = detectPreset(prompt);
  const baseTokenSet = getPreset(preset)!;

  // Deep clone to avoid mutating the preset
  const tokenSet: DesignTokenSet = JSON.parse(JSON.stringify(baseTokenSet));

  const modifiers = detectModifiers(prompt);
  const reasoningParts = [reason];

  for (const modifier of modifiers) {
    modifier.apply(tokenSet);
    reasoningParts.push(`Applied modifier: ${modifier.label}`);
  }

  if (modifiers.length === 0) {
    reasoningParts.push('No modifiers applied');
  }

  const recommendedReferences = findBestTypographyReferences(tokenSet).map((reference) => ({
    referenceId: reference.referenceId,
    referenceName: reference.referenceName,
    score: reference.score,
  }));

  if (recommendedReferences.length > 0) {
    reasoningParts.push(
      `Best-fit references: ${recommendedReferences
        .map(
          (reference: {
            referenceName: string;
            score: number;
          }) => `${reference.referenceName} (${reference.score}%)`,
        )
        .join(', ')}`,
    );
  }

  return {
    tokenSet,
    reasoning: reasoningParts.join('. ') + '.',
    recommendedReferences,
  };
}
