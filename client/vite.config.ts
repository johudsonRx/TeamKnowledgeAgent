import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api requests to your backend server
      '/api': {
        target: 'http://localhost:6000', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
}) 