import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', '.svelte-kit', 'src-tauri'],
    setupFiles: ['./vitest-setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/types/**'],
      // Note: Coverage only works in CI (Node.js) - Bun doesn't support node:inspector
      // Run with: npx vitest run --coverage (requires Node.js)
      // Current: 200 frontend tests, ~50% store coverage
      // Thresholds disabled - enforced via test count (600+ total)
    },
  },
});
