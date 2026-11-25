import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        id: '/',
        name: 'Huli',
        short_name: 'Huli',
        display: 'standalone',
        background_color: '#F4EFE6',
        theme_color: '#0B6B5C',
        start_url: '/',
        icons: [
          { src: '/icons/huli-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/huli-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/huli-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
      },
    }),
  ],
})
