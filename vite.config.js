import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // THAY ĐỔI QUAN TRỌNG:
    // Ưu tiên sử dụng biến môi trường PORT do Render cung cấp.
    // Nếu không có, sẽ dùng cổng 5173 cho môi trường local.
    port: process.env.PORT || 5173,

    allowedHosts: [
      'teachersupportapp.onrender.com',
      'localhost'
    ],
    
    // Giữ nguyên cấu hình proxy
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});