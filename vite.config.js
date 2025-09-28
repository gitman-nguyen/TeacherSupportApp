import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    
    // THÊM MỚI: Cấu hình CORS rõ ràng
    // Đảm bảo Vite server xử lý đúng các yêu cầu từ domain của bạn
    cors: {
      origin: ['http://localhost:5173', 'https://teachersupportapp.onrender.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    },
    
    allowedHosts: [
      'teachersupportapp.onrender.com',
      'localhost'
    ],
    proxy: {
      '/api': {
        // Thay đổi 'localhost' thành '127.0.0.1' để ép kết nối qua IPv4,
        // đảm bảo kết nối ổn định đến Gunicorn server.
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
});