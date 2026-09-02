// STATUS: PLATIN
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '.hqc-smoke-dist',
    rollupOptions: {
      input: fileURLToPath(new URL('../hqc-smoke.html', import.meta.url))
    }
  }
});
