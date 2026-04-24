import type { DeliveryManifest, DesignTokenSet, FontAsset } from '@fetchtype/types';

export type DeliveryManifestInput = {
  css: string;
  tokens: DesignTokenSet;
  fonts?: FontAsset[];
  preloadHints?: string[];
};

export function createDeliveryManifest(input: DeliveryManifestInput): DeliveryManifest {
  return {
    fonts: input.fonts ?? [],
    css: input.css,
    tokens: input.tokens,
    preloadHints: input.preloadHints ?? [],
    integrity: {},
  };
}
