import { defineConfig } from 'vite';
import { PHONE_MEDIA_QUERY, ABOVE_PHONE_MEDIA_QUERY } from './src/lib/breakpoints.js';

// Expand shared media queries in every stylesheet Vite processes, including
// styles linked from index.html and the timeline CSS imported by JavaScript.
const sharedBreakpoints = {
  postcssPlugin: 'shared-breakpoints',
  AtRule: {
    media(rule) {
      rule.params = rule.params
        .replaceAll('(--phone)', PHONE_MEDIA_QUERY)
        .replaceAll('(--above-phone)', ABOVE_PHONE_MEDIA_QUERY);
    }
  }
};

export default defineConfig({
  // Keep local development and built previews on one browser-storage origin.
  server: {
    host: '127.0.0.1',
    port: 9961,
    strictPort: true,
    // .NET publish temporarily locks intermediate files on Windows. Watch the
    // source and final public engine output, not the compiler's bin/obj trees.
    watch: { ignored: ['**/bin/**', '**/obj/**'] }
  },
  preview: { host: '127.0.0.1', port: 9961, strictPort: true },
  worker: { format: 'es' },
  css: { postcss: { plugins: [sharedBreakpoints] } },
  // Relative base so the build works at any mount path (GitHub Pages
  // serves at /TD-OHD/, local preview at /).
  base: './',
  build: {
    outDir: 'dist'
  }
});
