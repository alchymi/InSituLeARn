import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true,
    port: 8443,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        compile: resolve(__dirname, 'compile.html'),
      },
    },
  },
});
