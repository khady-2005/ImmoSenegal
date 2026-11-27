/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    // Empêche Vite de charger un postcss.config.js présent dans un dossier parent.
    postcss: { plugins: [] },
  },
  server: {
    port: 5173,
    // En développement, les appels /api sont redirigés vers le backend Spring Boot.
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 15000,
  },
})
