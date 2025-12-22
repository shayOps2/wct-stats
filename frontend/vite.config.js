import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false, // ← IMPORTANT inside Kubernetes
    host: true   // optional, allows external access in cluster
  },
  build: {
    outDir: 'dist',
  },
});
