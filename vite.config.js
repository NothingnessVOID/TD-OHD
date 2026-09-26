import { defineConfig } from 'vite';
import { buildInfo } from './scripts/build-info.mjs';

export default defineConfig(({ mode }) => ({
  plugins: [{ name: 'build-identity', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo(mode), null, 2) });
  } }],
  // Relative base so the build works at any mount path (GitHub Pages
  // serves at /TD-OHD/, local preview at /).
  base: './',
  build: {
    outDir: 'dist'
  }
}));
