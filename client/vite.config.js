import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) for phone access
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:5000',
      }
    }
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  }
});

