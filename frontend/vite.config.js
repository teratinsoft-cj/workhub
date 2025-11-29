import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Development server configuration
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for security
    minify: 'esbuild', // Use esbuild (faster, built-in, no extra dependency)
    // esbuild minification options
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
  },
})

