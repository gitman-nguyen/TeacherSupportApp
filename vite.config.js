import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Plugin react vẫn được giữ nguyên. Plugin csp tùy chỉnh đã được gỡ bỏ.
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,

    // THAY ĐỔI: Áp dụng Content Security Policy trực tiếp thông qua server headers
    // để đảm bảo tính nhất quán và khắc phục lỗi 'eval'.
    headers: {
      'Content-Security-Policy': 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "connect-src 'self' http://127.0.0.1:5001 https://www.googleapis.com ws:; " +
        "img-src 'self' data: https://lh3.googleusercontent.com; " +
        // THÊM MỚI: Cho phép nhúng iframe từ trang và từ Google Drive
        "frame-src 'self' https://drive.google.com;"
    },
    
    // Cấu hình CORS rõ ràng
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

