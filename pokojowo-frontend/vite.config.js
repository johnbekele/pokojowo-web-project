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
    port: 5173,
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
      // App backend - uses remote server (no local backend)
      '/api': {
        target: 'https://pokojowo-web-project.onrender.com',
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
