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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Never serve index.html as fallback for JS/CSS/API requests
        navigateFallbackDenylist: [/^\/api\//, /\/assets\//],
        runtimeCaching: [
          {
            // JS/CSS assets have hashed filenames — always fetch fresh on cache miss
            urlPattern: /\/assets\/.*\.(js|css)$/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'assets', networkTimeoutSeconds: 5 },
          },
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
