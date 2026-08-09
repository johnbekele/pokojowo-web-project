/* global __dirname */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    restoreMocks: true,
    clearMocks: true,
  },
});
