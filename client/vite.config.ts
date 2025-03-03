import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Bind to all interfaces
    port: 5173,
    proxy: {
      // Proxy all /api requests to your backend server
      '/api': {
        target: 'http://localhost:6000', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}) 