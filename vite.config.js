import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/data': 'http://localhost:3000',
      '/sync': 'http://localhost:3000',
      '/delete': 'http://localhost:3000',
      '/subscribe': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/register': 'http://localhost:3000',
      '/google-login': 'http://localhost:3000'
    }
  }
})
