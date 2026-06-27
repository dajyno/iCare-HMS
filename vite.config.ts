import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'logo.png', 'logo.svg'],
        manifest: {
          name: 'iCare HIMS',
          short_name: 'iCare',
          description:
            'A centralized hospital operations platform designed to digitize patient registration, appointments, clinical records, billing, laboratory workflows, and staff management.',
          theme_color: '#0088ff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 3000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      conditions: ['module', 'node', 'require', 'import', 'default'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join('/');
            if (!normalizedId.includes('/node_modules/')) return;
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router-dom/')
            ) {
              return 'react-vendor';
            }
            if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase-vendor';
            if (normalizedId.includes('/node_modules/@tanstack/')) return 'tanstack-vendor';
            if (normalizedId.includes('/node_modules/recharts/')) return 'charts-vendor';
            if (normalizedId.includes('/node_modules/motion/')) return 'motion-vendor';
            if (
              normalizedId.includes('/node_modules/@base-ui/') ||
              normalizedId.includes('/node_modules/radix-ui/') ||
              normalizedId.includes('/node_modules/@floating-ui/') ||
              normalizedId.includes('/node_modules/react-day-picker/')
            ) {
              return 'ui-vendor';
            }
            if (normalizedId.includes('/node_modules/lucide-react/')) return 'icons-vendor';
          },
        },
      },
    },
  };
});
