#!/bin/bash

# In ra các biến môi trường để gỡ lỗi trên Render
echo "--- Starting Services (Proxy Model) ---"
echo "Render assigned public PORT: $PORT"

# 1. Khởi động Backend service trên một cổng nội bộ cố định (5001) trong background
echo "Starting Backend service on internal port 5001..."
(cd backend && gunicorn --bind 0.0.0.0:5001 app:app) &

# Chờ một chút để backend có thời gian khởi động (tùy chọn nhưng được khuyến khích)
sleep 5

# 2. Khởi động Frontend service (Vite dev server) ở tiền cảnh
# Vite sẽ tự động đọc biến môi trường PORT từ file vite.config.js và lắng nghe trên đó.
echo "Starting Frontend service on public port $PORT..."
npm run dev