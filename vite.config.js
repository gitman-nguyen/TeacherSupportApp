import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    allowedHosts: [
      'teachersupportapp.onrender.com',
      'localhost'
    ],
    proxy: {
      '/api': {
        // THAY ĐỔI QUAN TRỌNG:
        // Thay đổi 'localhost' thành '127.0.0.1' để ép kết nối qua IPv4,
        // đảm bảo kết nối ổn định đến Gunicorn server.
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
});