import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serwuje apkę pod adresem czenczix.github.io/wierchy/,
  // więc wszystkie pliki muszą mieć ścieżki zaczynające się od /wierchy/.
  base: '/wierchy/',
  plugins: [
    react(),
    // PWA = strona, którą można zainstalować jak apkę i która działa bez internetu.
    VitePWA({
      // Nowa wersja apki instaluje się sama przy następnym otwarciu.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // Manifest: wizytówka apki dla telefonu (nazwa, ikona, kolory, tryb pełnoekranowy).
      manifest: {
        name: 'Wierchy – szczyty Tatr',
        short_name: 'Wierchy',
        description: 'Kolekcja zdobytych szczytów polskich Tatr',
        lang: 'pl',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#1f4d3a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Workbox buduje service workera: skrypt, który stoi między apką a internetem.
      workbox: {
        // Pliki apki zapisujemy w pamięci przy pierwszym otwarciu (precache).
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            // Kafelki mapy zapisujemy dopiero, gdy je obejrzysz (regulamin OpenTopoMap
            // nie pozwala pobierać ich hurtem). Najpierw sprawdzamy pamięć, potem internet.
            urlPattern: /^https:\/\/[abc]\.tile\.opentopomap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kafelki-mapy',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
