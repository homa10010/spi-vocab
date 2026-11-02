/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/spi-vocab/',
  // 単語データ（約4500語）をオフライン用に同梱しているため、JSが大きくなるのは想定どおり
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      },
      manifest: {
        name: 'SPI言語対策',
        short_name: 'SPI言語',
        description: '熟語と英単語をステージ制で解くSPI言語分野の対策アプリ',
        lang: 'ja',
        start_url: '/spi-vocab/',
        scope: '/spi-vocab/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2b4a8c',
        background_color: '#e9ede8',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/test-setup.ts',
  },
});
