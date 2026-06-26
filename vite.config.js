import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // use our existing public/manifest.json
      workbox: {
        globPatterns: [], // no precaching — prevents stale SW serving wrong assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/eeltgjgfmdvmtghtssyz\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
})
