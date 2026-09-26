/// <reference types="vitest" />
import { defineConfig } from 'vite';
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
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
