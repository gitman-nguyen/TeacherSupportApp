# Sử dụng image Python chính thức
FROM python:3.9-slim

# Đặt thư mục làm việc
WORKDIR /app

# Cài đặt các gói hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libjpeg-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Sao chép file requirements và cài đặt thư viện Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tạo một user không phải root để chạy ứng dụng
RUN useradd --create-home appuser
WORKDIR /home/appuser/app
USER appuser

# Sao chép toàn bộ mã nguồn của backend vào container
COPY . .

# Mở cổng 5001 để nhận request
EXPOSE 5001

# Lệnh để chạy ứng dụng với Gunicorn khi container khởi động
# Chạy 4 worker, bind vào port 5001, timeout 120s
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5001", "--timeout", "120", "app:app"]
