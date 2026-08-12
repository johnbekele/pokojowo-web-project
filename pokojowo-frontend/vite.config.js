/* global __dirname, process */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// Dependencies grouped so that each chunk is one thing a deploy can invalidate
// on its own: app code changes every deploy, these almost never do, and they
// used to share a single 830 KB entry chunk that was re-downloaded every time.
//
// Grouping is per library on purpose. Folding everything into one `vendor`
// chunk was measured to be worse, because it drags libraries that only a lazy
// route needs into the entry. Keep `vendor` for small, broadly used packages.
const VENDOR_CHUNKS = {
  react: ['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'],
  motion: ['framer-motion', 'motion-dom', 'motion-utils'],
  query: ['@tanstack/react-query', '@tanstack/query-core'],
  socket: ['socket.io-client', 'socket.io-parser', 'engine.io-client', 'engine.io-parser'],
  forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
  i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
};

// Leaflet is deliberately absent from the groups above and left to Rollup's own
// splitting. Naming it turns it into a static dependency of the entry, which
// puts 55 KB of map code back on the critical path of every first visit.
const LEAVE_TO_ROLLUP = ['leaflet', 'react-leaflet', '@react-leaflet/core'];

const PACKAGE_TO_CHUNK = new Map(
  Object.entries(VENDOR_CHUNKS).flatMap(([chunk, packages]) =>
    packages.map((pkg) => [pkg, chunk])
  )
);

function chunkForModule(id) {
  const afterModules = id.split(/node_modules[\\/]/).pop();
  if (!afterModules || afterModules === id) return undefined;
  const [first, second] = afterModules.split(/[\\/]/);
  const pkg = first.startsWith('@') ? `${first}/${second}` : first;
  if (LEAVE_TO_ROLLUP.includes(pkg)) return undefined;
  if (pkg.startsWith('@radix-ui/')) return 'radix';
  return PACKAGE_TO_CHUNK.get(pkg) ?? 'vendor';
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const sentryUploadEnabled =
    mode === 'production' &&
    Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
  const sentryRelease = process.env.VITE_SENTRY_RELEASE || process.env.SENTRY_RELEASE || 'pokojowo-web@1.0.0';

  const plugins = [react()];
  if (sentryUploadEnabled) {
    plugins.push(
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        release: {
          name: sentryRelease,
          inject: true,
          create: true,
          finalize: true,
        },
        sourcemaps: {
          assets: 'dist/**',
          filesToDeleteAfterUpload: 'dist/**/*.map',
        },
        telemetry: false,
      })
    );
  }

  return {
  plugins,
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
    // Publishing these serves the full readable source to anyone who opens
    // devtools on production. `vite build --mode development` still emits them
    // for debugging a real build locally.
    // Production maps are generated only for an authenticated Sentry upload,
    // hidden from browsers, and deleted after upload. Without the credentials
    // there is no map artifact to accidentally publish.
    sourcemap: mode === 'production' ? (sentryUploadEnabled ? 'hidden' : false) : true,
    rollupOptions: {
      output: {
        manualChunks: chunkForModule,
      },
    },
  },
  };
});
