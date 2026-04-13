import { defineConfig } from 'tsup';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: [/@fetchtype\//],
  external: ['@modelcontextprotocol/sdk'],
  onSuccess: async () => {
    // Copy registry.json so bundled @fetchtype/fonts can resolve it at runtime.
    // The fonts package resolves path as: resolve(__dirname, '../data/registry.json')
    // When bundled into cli/dist/, __dirname = cli/dist/, so we need cli/data/registry.json.
    const src = resolve(__dirname, '../fonts/data/registry.json');
    const dest = resolve(__dirname, 'data/registry.json');
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  },
});
