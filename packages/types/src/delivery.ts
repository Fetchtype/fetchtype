import type { FontAsset } from './font.js';

// -- Delivery manifest: what gets shipped to the consumer --

export type ComponentManifest = {
  framework: 'react' | 'svelte' | 'vue' | 'astro';
  components: string[];
  entrypoint: string;
};

export type DeliveryManifest = {
  fonts: FontAsset[];
  css: string;
  tokens: Record<string, unknown>;
  components?: ComponentManifest;
  preloadHints: string[];
  integrity: Record<string, string>;
};
