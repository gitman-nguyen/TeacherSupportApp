import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,

    headers: {
      'Content-Security-Policy': 
        "default-src 'self'; " +
        // SỬA LỖI: Thêm https://unpkg.com để cho phép tải thư viện heic2any
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "connect-src 'self' http://127.0.0.1:5001 https://www.googleapis.com https://cdn.jsdelivr.net ws:; " +
        "img-src 'self' data: blob: https://lh3.googleusercontent.com; " + 
        "frame-src 'self' https://drive.google.com; " +
        // SỬA LỖI: Đảm bảo có chỉ thị worker-src để thư viện AI hoạt động
        "worker-src 'self' blob:;"
    },
    
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

