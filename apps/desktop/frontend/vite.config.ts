import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@dnd-kit')) return 'dnd-kit'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('react')) return 'react'
          if (id.includes('react-i18next') || id.includes('i18next')) return 'i18n'
          if (id.includes('@tanstack')) return 'tanstack'
          if (id.includes('lucide-react') || id.includes('@radix-ui/react-icons')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9876',
        changeOrigin: true,
      },
    },
  },
})
