import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `~` prefix in Carbon's SCSS/CSS font references is a webpack convention.
// This alias lets Vite resolve `~@ibm/plex/...` to the installed package so IBM
// Plex fonts are bundled and rendered locally.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^~(.*)$/, replacement: '$1' }],
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['mixed-decls', 'global-builtin', 'import'],
      },
    },
  },
});
