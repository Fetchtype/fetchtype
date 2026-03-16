import type { FetchTypeConfig } from '@fetchtype/types';

// "fetchtype:recommended" — current defaults, all rules enabled at their default severities
export const RECOMMENDED_PROFILE: Partial<FetchTypeConfig> = {
  rules: {}, // empty = all defaults
};

// "fetchtype:strict" — all rules as errors, tight thresholds
export const STRICT_PROFILE: Partial<FetchTypeConfig> = {
  rules: {
    'color.contrast': 'error',
    'color.dark-mode': 'error',
    'scale.descending': 'error',
    'scale.base-size': 'error',
    'spacing.consistency': 'error',
    'type.line-height': 'error',
    'type.caption-minimum': 'error',
    'layout.max-width': 'error',
    'font.fallback-fonts': 'error',
    'font.weight-available': 'error',
    'font.axis-range': 'error',
    'font.subset-coverage': 'error',
    'font.display-strategy': 'error',
    'font.preload-count': 'error',
    'font.fluid-type': 'error',
    'font.payload-budget': 'error',
    'font.availability': 'error',
    'policy.font-allowlist': 'error',
    'policy.font-blocklist': 'error',
  },
  performance: {
    maxFontCount: 3,
    maxPreloadCount: 2,
  },
};

// "fetchtype:accessibility" — WCAG AAA focus, large minimums
export const ACCESSIBILITY_PROFILE: Partial<FetchTypeConfig> = {
  rules: {
    'color.contrast': { severity: 'error', options: { minRatio: 7 } },
    'type.line-height': { severity: 'error', options: { min: 1.5 } },
    'type.caption-minimum': 'error',
    'scale.base-size': { severity: 'error', options: { minPx: 16 } },
    'font.display-strategy': 'error',
  },
  requiredSubsets: ['latin', 'latin-ext'],
};

export const BUILT_IN_PROFILES: Record<string, Partial<FetchTypeConfig>> = {
  'fetchtype:recommended': RECOMMENDED_PROFILE,
  'fetchtype:strict': STRICT_PROFILE,
  'fetchtype:accessibility': ACCESSIBILITY_PROFILE,
};

export function resolveProfile(name: string): Partial<FetchTypeConfig> | undefined {
  return BUILT_IN_PROFILES[name];
}
