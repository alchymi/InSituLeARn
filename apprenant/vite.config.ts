import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 8443,
    strictPort: true,
    // Proxy /api and /_ to PocketBase so apprenant (HTTPS) avoids mixed content
    // when running on the LAN against PocketBase (HTTP).
    proxy: {
      '/api': {
        target: 'http://localhost:8092',
        changeOrigin: true,
      },
      '/_': {
        target: 'http://localhost:8092',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
});
