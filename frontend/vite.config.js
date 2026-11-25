// vitest/config re-exports Vite's defineConfig, so the same file drives dev,
// build and tests without maintaining a second config file.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Optimize for development
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Optimize build performance
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  },
  css: {
    // Optimize CSS processing
    devSourcemap: true
  },
  test: {
    // jsdom gives tests a real DOM without a browser; components use localStorage
    // and window events, which only exist in a DOM environment.
    environment: 'jsdom',
    // globals stay off so test files import describe/it/expect explicitly and the
    // shared ESLint config needs no test-specific overrides.
    globals: false,
    setupFiles: './src/test/setup.js'
  }
})
