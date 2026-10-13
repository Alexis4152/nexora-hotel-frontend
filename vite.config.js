import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo el frontend llama a /api y Vite lo reenvía al backend (puerto 8090): para el navegador es el
// mismo origen, así la cookie httpOnly del refresh token funciona sin CORS ni SameSite=None.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:8090', changeOrigin: true },
      '/media': { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
