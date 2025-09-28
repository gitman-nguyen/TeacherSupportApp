import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// THÊM MỚI: Plugin để tùy chỉnh header Content-Security-Policy
const cspPlugin = () => ({
  name: 'csp-plugin',
  configureServer: server => {
    server.middlewares.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        // 'self': Cho phép script từ cùng nguồn.
        // 'unsafe-eval': Cho phép sử dụng eval(), khắc phục lỗi của bạn.
        // https://...: Các nguồn đáng tin cậy khác cho các thư viện bên ngoài (Google, CDN).
        "script-src 'self' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net;"
      );
      next();
    });
  },
});


export default defineConfig({
  // THAY ĐỔI: Thêm plugin cspPlugin vào danh sách
  plugins: [react(), cspPlugin()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    
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

