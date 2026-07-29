// fallow-ignore-file unused-file -- Stryker resolves this config dynamically.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['scripts/**', '**/scripts/**', '**/.dlinter-mutation-tmp/**'],
    deps: { optimizer: { client: { enabled: false }, ssr: { enabled: false } } },
  },
});
