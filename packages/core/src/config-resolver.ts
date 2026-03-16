import { FetchTypeConfigSchema, type FetchTypeConfig } from '@fetchtype/types';

import { resolveProfile } from './profiles.js';

/**
 * Resolve a raw config object by expanding any `extends` chain, merging
 * bases left-to-right, and applying local overrides on top.
 * Pure: no file I/O, no async.
 */
export function resolveConfig(raw: Partial<FetchTypeConfig>): FetchTypeConfig {
  const { extends: extendsField, ...localOverrides } = raw;

  if (!extendsField) {
    return FetchTypeConfigSchema.parse(localOverrides);
  }

  const names = Array.isArray(extendsField) ? extendsField : [extendsField];

  // Resolve and merge bases left-to-right
  let merged: Record<string, unknown> = {};
  for (const name of names) {
    if (!name.startsWith('fetchtype:')) {
      throw new Error(
        `npm package extends not yet supported, use built-in profiles: fetchtype:recommended, fetchtype:strict, fetchtype:accessibility`,
      );
    }
    const profile = resolveProfile(name);
    if (!profile) {
      throw new Error(
        `Unknown built-in profile "${name}". Available profiles: fetchtype:recommended, fetchtype:strict, fetchtype:accessibility`,
      );
    }
    merged = mergeConfigs(merged as Partial<FetchTypeConfig>, profile);
  }

  // Apply local overrides on top
  const resolved = mergeConfigs(merged as Partial<FetchTypeConfig>, localOverrides);
  return FetchTypeConfigSchema.parse(resolved);
}

function mergeConfigs(
  base: Partial<FetchTypeConfig>,
  override: Partial<FetchTypeConfig>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base, ...override };

  // Deep-merge rules per-rule (override wins per key, not full replacement)
  if (base.rules !== undefined || override.rules !== undefined) {
    result['rules'] = {
      ...(base.rules ?? {}),
      ...(override.rules ?? {}),
    };
  }

  // Deep-merge performance (override wins per key)
  if (base.performance !== undefined || override.performance !== undefined) {
    result['performance'] = {
      ...(base.performance ?? {}),
      ...(override.performance ?? {}),
    };
  }

  // Deep-merge fonts (override wins per key)
  if (base.fonts !== undefined || override.fonts !== undefined) {
    result['fonts'] = {
      ...(base.fonts ?? {}),
      ...(override.fonts ?? {}),
    };
  }

  return result;
}
