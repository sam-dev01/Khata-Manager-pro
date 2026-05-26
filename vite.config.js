import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/', // Changed to absolute path for proper PWA/SPA routing on Hostinger
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'antd', '@ant-design/icons'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          utils: ['dayjs', 'dexie', 'dexie-react-hooks']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
