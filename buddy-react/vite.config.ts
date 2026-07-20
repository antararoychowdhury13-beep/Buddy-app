import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Faithful React clone of the Buddy AI prototype. Reuses the prototype's exact
// home.css and vanilla module renderers, mounted into a React phone shell.
export default defineConfig({
  plugins: [react()],
  server: { port: 5273 },
});
