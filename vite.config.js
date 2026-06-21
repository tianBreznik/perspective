import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0', // Bind to all interfaces for network access
    port: 3000,
    strictPort: false, // Try next port if 3000 is in use
    open: true,
    allowedHosts: true, // Allow any host (needed for LAN access)
  },
  publicDir: 'public', // Serve files from public directory
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});

