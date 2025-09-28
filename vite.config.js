import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cập nhật Plugin để có một chính sách bảo mật đầy đủ hơn
const cspPlugin = () => ({
  name: 'csp-plugin',
  configureServer: server => {
    server.middlewares.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        // THAY ĐỔI: Thiết lập một chính sách bảo mật hoàn chỉnh hơn
        "default-src 'self'; " + // Mặc định chỉ cho phép từ chính trang web
        // Cho phép script từ trang, inline, eval, và các CDN đáng tin cậy
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net; " +
        // Cho phép style từ trang, inline, và CDN của flatpickr
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        // Cho phép kết nối API đến backend và kết nối WebSocket (ws:) cho Vite
        "connect-src 'self' http://127.0.0.1:5001 ws:;"
      );
      next();
    });
  },
});


export default defineConfig({
  // Thêm plugin cspPlugin vào danh sách
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

