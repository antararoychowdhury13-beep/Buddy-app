import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Faithful React clone of the Buddy AI prototype. Reuses the prototype's exact
// home.css and vanilla module renderers, mounted into a React phone shell.
export default defineConfig({
  // Relative base so the built app works from any path — GitHub Pages project
  // subpath, Netlify/Vercel root, or opened directly. The app has no router
  // (tab state only), so relative asset URLs are all it needs.
  base: './',
  plugins: [react()],
  server: { port: 5273 },
});
