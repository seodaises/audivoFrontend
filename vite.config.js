import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 8080, strictPort: true},
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate': a new deployed version takes over silently on next
      // load, no "refresh to update" prompt to build. Simplest option for
      // an app without a strong reason to ask the user first.
      registerType: 'autoUpdate',

      // App-shell caching only, per your call earlier — this precaches the
      // built JS/CSS/HTML so the UI loads instantly and works offline.
      // Deliberately NOT touching audio files or API responses: caching
      // credentialed song streams is a separate, bigger decision.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },

      manifest: {
        name: 'Audivo',
        short_name: 'Audivo',
        description: 'Stream and manage your music on Audivo.',
        start_url: '/',
        display: 'standalone',       // hides the browser chrome when installed
        // Matches theme.js: AMBER_DARK for the accent, the dark-mode
        // background for the splash screen while the app boots.
        theme_color: '#E0983F',
        background_color: '#121212',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            // 'maskable' lets Android crop the icon into a circle/rounded
            // square without your logo getting clipped oddly — needs the
            // same 512.png to have safe padding around the logo.
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})