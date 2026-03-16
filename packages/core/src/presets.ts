import { DesignTokenSetSchema, type DesignTokenSet } from '@fetchtype/types';

import baseTokenSet from './base.tokens.json' with { type: 'json' };
import carbonTokenSet from './carbon.tokens.json' with { type: 'json' };
import dashboardTokenSet from './dashboard.tokens.json' with { type: 'json' };
import docsTokenSet from './docs.tokens.json' with { type: 'json' };
import ecommerceTokenSet from './ecommerce.tokens.json' with { type: 'json' };
import editorialTokenSet from './editorial.tokens.json' with { type: 'json' };
import fluentTokenSet from './fluent.tokens.json' with { type: 'json' };
import materialTokenSet from './material.tokens.json' with { type: 'json' };
import radixTokenSet from './radix.tokens.json' with { type: 'json' };
import spectrumTokenSet from './spectrum.tokens.json' with { type: 'json' };

export const DEFAULT_TOKEN_SET: DesignTokenSet = DesignTokenSetSchema.parse(baseTokenSet);

export const PRESETS: Record<string, DesignTokenSet> = {
  base: DesignTokenSetSchema.parse(baseTokenSet),
  editorial: DesignTokenSetSchema.parse(editorialTokenSet),
  dashboard: DesignTokenSetSchema.parse(dashboardTokenSet),
  ecommerce: DesignTokenSetSchema.parse(ecommerceTokenSet),
  docs: DesignTokenSetSchema.parse(docsTokenSet),
  fluent: DesignTokenSetSchema.parse(fluentTokenSet),
  material: DesignTokenSetSchema.parse(materialTokenSet),
  carbon: DesignTokenSetSchema.parse(carbonTokenSet),
  spectrum: DesignTokenSetSchema.parse(spectrumTokenSet),
  radix: DesignTokenSetSchema.parse(radixTokenSet),
};

export const PRESET_NAMES: string[] = Object.keys(PRESETS);

export function getPreset(name: string): DesignTokenSet | undefined {
  return PRESETS[name];
}
