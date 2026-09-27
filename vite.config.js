import { defineConfig } from 'vite';

export default defineConfig({
  worker: { format: 'es' },
  // Relative base so the build works at any mount path (GitHub Pages
  // serves at /TD-OHD/, local preview at /).
  base: './',
  build: {
    outDir: 'dist'
  }
});
