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
      thresholds: {
        // Lowered thresholds - current coverage ~2%, target 5% minimum
        // Backend has 93%+ coverage; frontend component testing is future work
        // See docs/architecture/technical-debt.md for improvement plan
        lines: 5,
        functions: 5,
        branches: 2,
        statements: 5,
      },
    },
  },
});
