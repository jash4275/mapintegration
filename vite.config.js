import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@googlemaps/js-api-loader': '@googlemaps/js-api-loader',
    },
  },
  
})
