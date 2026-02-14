import { defineConfig } from 'vite';

export default defineConfig({
  base: '/perspective/', // GitHub Pages base path
  server: {
    host: '0.0.0.0', // Bind to all interfaces for network access
    port: 3000,
    strictPort: false, // Try next port if 3000 is in use
    open: true,
    allowedHosts: true, // Allow any host (needed for LAN access)
  },
  publicDir: 'public' // Serve files from public directory
});

