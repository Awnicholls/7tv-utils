import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const csp: Plugin = {
  apply: 'build',
  name: 'inject-csp',
  transformIndexHtml: () => [
    {
      attrs: {
        content:
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.7tv.app; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
        'http-equiv': 'Content-Security-Policy',
      },
      injectTo: 'head',
      tag: 'meta',
    },
  ],
};

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'chrome140',
  },
  clearScreen: false,
  plugins: [react(), csp],
  server: {
    port: 1420,
    strictPort: true,
  },
});
