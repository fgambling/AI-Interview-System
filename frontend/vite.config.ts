import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.VITE_BACKEND_ORIGIN || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
