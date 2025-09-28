import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Cấu hình để server có thể truy cập từ bên ngoài container
    host: '0.0.0.0',
    port: 5173,

    // Giữ lại cấu hình allowedHosts của bạn
    allowedHosts: [
      'teachersupportapp.onrender.com',
      'localhost' // Thêm localhost để dễ phát triển
    ],

    // Cấu hình Reverse Proxy
    proxy: {
      // Bất kỳ request nào tới đường dẫn bắt đầu bằng /api
      '/api': {
        // sẽ được chuyển tiếp đến server backend đang chạy ở cổng 5001
        target: 'http://localhost:5001',
        
        // Thay đổi origin của request để backend chấp nhận
        changeOrigin: true,
        
        // THAY ĐỔI: Đã xóa bỏ dòng `rewrite` ở đây.
        // Bằng cách này, request tới /api/settings sẽ được chuyển tiếp
        // y hệt thành /api/settings đến backend, khớp với các route đã sửa trong app.py.
      },
    },
  },
});

