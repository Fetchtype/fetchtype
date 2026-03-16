import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@fetchtype/core': resolve(__dirname, '../core/src/index.ts'),
      '@fetchtype/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
});
