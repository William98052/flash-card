import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
    workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,json}'] },
    manifest: {
      name: '汉字闪练 · AP Chinese Flash Cards',
      short_name: '汉字闪练',
      description: '本地优先的 AP 中文汉字闪卡练习',
      lang: 'zh-Hans',
      start_url: '/',
      display: 'standalone',
      background_color: '#f8f1e5',
      theme_color: '#8c2f23',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  })],
  build: { chunkSizeWarningLimit: 1000 },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', '.worktrees/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
