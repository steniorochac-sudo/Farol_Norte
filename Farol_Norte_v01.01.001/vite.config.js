import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'LumeKoin',
        short_name: 'LumeKoin',
        description: 'Gestão Financeira Inteligente',
        theme_color: '#0d6efd',
        background_color: '#f8f9fa',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  // ===  BLOCO BUILD ===
  build: {
    chunkSizeWarningLimit: 2500, // Aumenta o limite do aviso
    rollupOptions: {
      output: {
        manualChunks: {
          // Quebra as bibliotecas mais pesadas em arquivos separados
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js'],
          pdf: ['pdfjs-dist']
        }
      }
    }
  }
})