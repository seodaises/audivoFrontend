import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 5173, strictPort: true},
  preview: { port: 5173, strictPort: true },
  plugins: [
    react(),
    VitePWA({

      devOptions: { enabled: true },
      registerType: 'autoUpdate',
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