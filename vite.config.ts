import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serwuje apkę pod adresem czenczix.github.io/wierchy/,
  // więc wszystkie pliki muszą mieć ścieżki zaczynające się od /wierchy/.
  base: '/wierchy/',
  plugins: [react()],
})
