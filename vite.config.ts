/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` emits relative asset URLs. Combined with hash routing (the document
// path never changes), this makes the build work unmodified at a domain root, at
// https://<user>.github.io/<repo>/, or from a file:// preview — no repo name baked in.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // CSS is not processed into jsdom: these tests assert behaviour and accessible
    // structure, and jsdom's cascade cannot resolve the rem-based custom properties
    // the design tokens are built on. Visual verification happens in a real browser.
    css: false,
  },
});
