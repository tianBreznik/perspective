import { defineConfig } from 'vite';

export default defineConfig({
  base: '/perspective/', // GitHub Pages base path
  server: {
    host: true, // Allow access from network (0.0.0.0)
    port: 3000,
    open: true
  },
  publicDir: 'public' // Serve files from public directory
});

