import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sitemap.xml': 'http://localhost:5000',
      '/robots.txt': 'http://localhost:5000'
    }
  },
  build: {
    sourcemap: true
  }
})
