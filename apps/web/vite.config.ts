import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Enable source maps for production debugging
    sourcemap: true,
    // Target modern browsers to eliminate legacy JS transforms
    target: 'es2020',
    // CSS code splitting to avoid render-blocking monolithic CSS
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better tree shaking and caching
        manualChunks: {
          // Core React runtime - changes rarely, cache aggressively
          'vendor-react': ['react', 'react-dom'],
          // Router - separate chunk for better caching
          'vendor-router': ['react-router-dom'],
          // Charting library is heavy, load only when needed
          'vendor-recharts': ['recharts'],
          // i18n library
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Analytics - non-critical, can load late
          'vendor-analytics': ['mixpanel-browser'],
        },
      },
    },
    // Increase chunk size warning to 300KB
    chunkSizeWarningLimit: 300,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
