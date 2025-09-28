#!/bin/bash

# Bật tính năng quản lý tiến trình của bash
set -m

# Khởi động service backend trong nền (background)
echo "Dang khoi dong service Backend..."
cd /app/backend
gunicorn --workers 4 --bind 0.0.0.0:5001 --timeout 120 app:app &

# Chờ một chút để backend ổn định (tùy chọn)
sleep 5

# Khởi động service frontend ở tiền cảnh (foreground)
# Cờ --host là cần thiết để server của Vite có thể được truy cập từ bên ngoài container
echo "Dang khoi dong service Frontend..."
cd /app
npm run build && npx serve -s dist


