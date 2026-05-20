import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/weather': {
        target: 'https://nq2tuphf9j.re.qweatherapi.com/v7',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/weather/, ''),
      },
      '/api/geo': {
        target: 'https://geoapi.qweather.com/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geo/, ''),
      },
    },
  },
})
