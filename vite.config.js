import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Plugin react vẫn được giữ nguyên.
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,

    headers: {
      'Content-Security-Policy': 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        // THAY ĐỔI: Thêm https://cdn.jsdelivr.net để cho phép tải các model AI
        "connect-src 'self' http://127.0.0.1:5001 https://www.googleapis.com https://cdn.jsdelivr.net ws:; " +
        "img-src 'self' data: https://lh3.googleusercontent.com; " +
        "frame-src 'self' https://drive.google.com;"
    },
    
    // Cấu hình CORS rõ ràng
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
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
});

