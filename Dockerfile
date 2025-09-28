# Bước 1: Sử dụng base image Python và cài đặt các công cụ cần thiết
FROM python:3.9-slim

# Cài đặt các gói hệ thống cho backend và các công cụ chung như curl
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libjpeg-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Node.js v18 và npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Thiết lập thư mục làm việc chính
WORKDIR /app

# --- Cấu hình cho Backend ---
# Sao chép file requirements.txt trước để tận dụng cache của Docker
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Sao chép toàn bộ mã nguồn của backend
COPY backend/ ./backend/

# --- Cấu hình cho Frontend ---
# Sao chép các file package.json trước để tận dụng cache
COPY package*.json ./
RUN npm install

# Sao chép toàn bộ mã nguồn của frontend
# Lưu ý: Lệnh này phải đặt sau khi đã copy backend, nếu không nó sẽ ghi đè
COPY . .

# --- Cấu hình khởi động ---
# Sao chép script khởi động và cấp quyền thực thi
COPY start.sh .
RUN chmod +x ./start.sh

# Mở các cổng cần thiết cho cả hai ứng dụng
EXPOSE 5001 5173

# Lệnh để chạy script khởi động khi container bắt đầu
CMD ["./start.sh"]
