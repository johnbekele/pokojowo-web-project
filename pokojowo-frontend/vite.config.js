import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '.localhost',
    ],
    watch: {
      usePolling: true,
    },
    proxy: {
      // Scraper backend - runs locally for development
      '/api/scraper': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      // App backend - remote by default; set VITE_DEV_API_PROXY to a local
      // API (e.g. http://localhost:8000) when working on unreleased endpoints.
      '/api': {
        target:
          process.env.VITE_DEV_API_PROXY || 'https://pokojowo-web-project.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
