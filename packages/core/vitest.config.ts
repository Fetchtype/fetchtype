import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@fetchtype/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
});
