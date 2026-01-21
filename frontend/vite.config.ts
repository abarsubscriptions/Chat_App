import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/token': 'http://127.0.0.1:8002',
      '/register': 'http://127.0.0.1:8002',
      '/users': 'http://127.0.0.1:8002',
      '/groups': 'http://127.0.0.1:8002',
      '/messages': 'http://127.0.0.1:8002',
      '/conversations': 'http://127.0.0.1:8002',

      '/ws': {
        target: 'ws://127.0.0.1:8002',
        ws: true,
      }
    }
  }
})
