import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'


/** Dev-only: relays the browser's `[speech]` diagnostics to the terminal. */
function speechLogRelay(): Plugin {
  return {
    name: 'speech-log-relay',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__speech-log', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const entry = JSON.parse(body)
            console.log(`[browser-speech] ${entry.stage}`, entry.detail === undefined ? '' : JSON.stringify(entry.detail))
          } catch { console.log('[browser-speech] unparsable payload', body.slice(0, 200)) }
          res.statusCode = 204; res.end()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), speechLogRelay(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
    workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,json}'] },
    manifest: {
      name: 'Hanzi Flash · AP Chinese Flash Cards',
      short_name: 'Hanzi Flash',
      description: 'Local-first AP Chinese character flash cards',
      lang: 'en',
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
  server: { port: Number(process.env.PORT) || 5173 },
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
