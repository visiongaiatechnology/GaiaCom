// STATUS: DIAMANT VGT SUPREME
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'baseline-widely-available',
    sourcemap: false,
    chunkSizeWarningLimit: 1600
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
