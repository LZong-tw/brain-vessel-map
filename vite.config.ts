/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` makes every asset URL relative, so the same build works at
// https://<user>.github.io/<repo>/ (GitHub Pages project site), at a custom domain root,
// or opened from any sub-folder — no repo name hard-coded here.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // React gets its own chunk so the entry does not pull in three.js: the 3D scene
        // (three + react-three-fiber) is only loaded when the 3D view is first shown
        manualChunks(id) {
          // shared helpers must not land in a lazy chunk, or the entry would import it eagerly
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'react';
          if (/node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/.test(id)) return 'react';
          if (/node_modules[\\/]three[\\/]/.test(id)) return 'three';
          if (/node_modules[\\/](@react-three|three-stdlib)[\\/]/.test(id)) return 'r3f';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // component tests need a DOM; everything else (engine/state/anatomy) stays on the
    // faster 'node' environment. A per-file `// @vitest-environment jsdom` docblock
    // also works and takes precedence over this glob.
    environmentMatchGlobs: [['src/components/**', 'jsdom']],
    // local tooling (e.g. agent worktrees under .claude/) must not be picked up as tests
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
