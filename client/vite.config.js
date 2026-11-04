import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin to mirror built files to server/public so Node backend and Android APK always have the latest build
function syncToServerPublic() {
  return {
    name: 'sync-to-server-public',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const targetDir = path.resolve(__dirname, '../server/public');
        if (fs.existsSync(distDir)) {
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.cpSync(distDir, targetDir, { recursive: true });
          console.log('[Vite Build] Successfully mirrored dist assets to server/public');
        }
      } catch (e) {
        console.warn('[Vite Build] Mirror to server/public note:', e.message);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), syncToServerPublic()],
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
    outDir: 'dist',
    emptyOutDir: true,
  }
});
