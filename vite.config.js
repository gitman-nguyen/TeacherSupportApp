import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Cấu hình để server có thể truy cập từ bên ngoài container
    host: '0.0.0.0',

    // Ưu tiên sử dụng biến môi trường PORT do Render cung cấp.
    // Nếu không có, sẽ dùng cổng 5173 cho môi trường local.
    port: process.env.PORT || 5173,

    // Cấu hình các host được phép truy cập
    allowedHosts: [
      'teachersupportapp.onrender.com',
      'localhost'
    ],
    
    // Cấu hình chuyển tiếp (proxy) các yêu cầu API đến backend
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});

