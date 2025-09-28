from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import requests
# --- CÁC THƯ VIỆN KHÔNG CÒN CẦN THIẾT ĐÃ ĐƯỢC XÓA ---
# import imagehash
# from PIL import Image
# import face_recognition
# import numpy as np
import io
import sys
import subprocess
import json
import tempfile

# Thư viện cho Auth
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)

# --- Cấu hình CORS và Database ---
# THAY ĐỔI 1: Cập nhật cấu hình CORS để chỉ cho phép các request đến /api/*
# và thêm URL của Render vào danh sách origins được phép.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "https://teachersupportapp.onrender.com"]}})
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_default_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Hàm trợ giúp ---
def print_to_stderr(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(200), nullable=True)
    role = db.Column(db.String(50), nullable=False, default='User')
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    drive_access_token = db.Column(db.String(500), nullable=True) 
    drive_refresh_token = db.Column(db.String(500), nullable=True) 

class Setting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.String(200), nullable=True)
    api_key = db.Column(db.String(200), nullable=True)
    source_folder_id = db.Column(db.String(200), nullable=True)

class RecurringSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    school_name = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(100), nullable=False)
    days_of_week = db.Column(db.JSON, nullable=False)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    expiry_date = db.Column(db.String(10), nullable=True)

class OneOffSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    school_name = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)

# --- Logic Bảo mật (Authentication & Authorization) ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 404
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'Admin':
            return jsonify({'error': 'Admin role required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# --- API Endpoints ---
# THAY ĐỔI 2: Thêm tiền tố /api vào tất cả các route để nhất quán
@app.route('/api/save_drive_token', methods=['POST'])
@token_required
def save_drive_token(current_user):
    data = request.get_json()
    token = data.get('access_token')
    refresh_token = data.get('refresh_token')
    
    if not token:
        print_to_stderr("LỖI: Frontend không gửi Access Token.")
        return jsonify({'error': 'Missing access token'}), 400

    try:
        current_user.drive_access_token = token
        if refresh_token:
            current_user.drive_refresh_token = refresh_token
            
        db.session.commit()
        print_to_stderr(f"Lưu Access Token Drive thành công cho user: {current_user.email}. Refresh token provided: {bool(refresh_token)}")
        return jsonify({'message': 'Drive token saved successfully'}), 200
    except Exception as e:
        print_to_stderr(f"LỖI DB khi lưu Drive Token: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to save drive token'}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        # Yêu cầu token admin để thay đổi cài đặt
        auth_header = request.headers.get('x-access-token')
        if not auth_header:
            return jsonify({'error': 'Token is missing for saving settings'}), 401
        try:
            data = jwt.decode(auth_header, app.config['SECRET_KEY'], algorithms=["HS256"])
            user = User.query.get(data['user_id'])
            if not user or user.role != 'Admin':
                return jsonify({'error': 'Admin role required to save settings'}), 403
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({'error': 'Token is invalid or expired'}), 401

        data = request.get_json()
        settings = Setting.query.first()
        if not settings:
            settings = Setting(client_id=data.get('client_id'), api_key=data.get('api_key'), source_folder_id=data.get('source_folder_id'))
            db.session.add(settings)
        else:
            settings.client_id = data.get('client_id')
            settings.api_key = data.get('api_key')
            settings.source_folder_id = data.get('source_folder_id')
        db.session.commit()
        return jsonify({"message": "Settings saved successfully"}), 200

    if request.method == 'GET':
        settings = Setting.query.first()
        if not settings:
            return jsonify({ "client_id": "", "api_key": "", "source_folder_id": "" }), 200
        return jsonify({ "client_id": settings.client_id, "api_key": settings.api_key, "source_folder_id": settings.source_folder_id }), 200

# --- API Authentication ---
@app.route('/api/auth/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    print_to_stderr("--- ADMIN LOGIN ATTEMPT ---")
    print_to_stderr(f"Received data: {data}")

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    username = data.get('username').lower()
    
    user = User.query.filter(User.email == username + '@local.admin', User.role == 'Admin').first()
    
    if not user:
        print_to_stderr(f"Could not find user with standard email. Trying fallback search for email: {username}")
        user = User.query.filter(User.email == username, User.role == 'Admin').first()

    if not user:
        print_to_stderr("DEBUG: Login failed. Reason: User not found in database after both attempts.")
        return jsonify({'error': 'Sai tên đăng nhập hoặc mật khẩu.'}), 401
    
    print_to_stderr(f"DEBUG: User '{user.name}' found. Checking password...")

    is_password_correct = check_password_hash(user.password_hash, data['password'])

    if not is_password_correct:
        print_to_stderr("DEBUG: Login failed. Reason: Password incorrect.")
        return jsonify({'error': 'Sai tên đăng nhập hoặc mật khẩu.'}), 401
    
    print_to_stderr("DEBUG: Password check successful. Generating token...")
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    print_to_stderr("DEBUG: Token generated. Login successful.")
    return jsonify({'name': user.name, 'role': user.role, 'apiToken': token})

@app.route('/api/auth/google-login', methods=['POST'])
def google_login():
    data = request.get_json()
    print_to_stderr("--- GOOGLE LOGIN ATTEMPT ---")
    
    if not data or 'token' not in data:
        print_to_stderr("ERROR: Missing token in request data.")
        return jsonify({'error': 'Token is missing'}), 400
    
    settings = Setting.query.first()
    if not settings or not settings.client_id:
        print_to_stderr("ERROR: Client ID is not configured in Settings.")
        return jsonify({'error': 'Google Client ID chưa được cấu hình trên server.'}), 500
    
    CLIENT_ID = settings.client_id
    
    try:
        id_info = id_token.verify_oauth2_token(data['token'], google_requests.Request(), audience=CLIENT_ID)
        
        google_id = id_info.get('sub')
        user_email = id_info.get('email')
        user_name = id_info.get('name')
        
        print_to_stderr(f"Token verified for Google ID: {google_id}, Email: {user_email}")

        user = User.query.filter_by(google_id=google_id).first()
        
        if not user:
            user = User.query.filter_by(email=user_email).first()
            if user:
                user.google_id = google_id
                user.name = user_name
                print_to_stderr(f"Cập nhật Google ID cho user: {user_email}")
            else:
                print_to_stderr(f"New user found via Google. Creating DB record for: {user_email}")
                user = User(
                    email=user_email,
                    name=user_name,
                    google_id=google_id,
                    role='User',
                    drive_access_token=None, 
                    drive_refresh_token=None
                )
                db.session.add(user)

        try:
            db.session.commit()
            print_to_stderr("User record updated/created successfully in DB.")
        except Exception as db_error:
            db.session.rollback()
            print_to_stderr(f"DB ERROR: Failed to commit user {user_email}: {db_error}")
            return jsonify({'error': f'Lỗi cơ sở dữ liệu khi tạo/cập nhật tài khoản: {str(db_error)}'}), 500

        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        print_to_stderr(f"SUCCESS: User {user.id} logged in. Token generated.")
        return jsonify({'name': user.name, 'role': user.role, 'apiToken': token})

    except ValueError as e:
        print_to_stderr(f"AUTH ERROR (ValueError): Invalid Google token or Client ID mismatch: {e}")
        return jsonify({'error': 'Invalid Google token hoặc Client ID không khớp. Vui lòng kiểm tra lại cấu hình.'}), 401
    except Exception as e:
        print_to_stderr(f"UNHANDLED ERROR: Unhandled exception during Google login: {e}")
        return jsonify({'error': 'Lỗi máy chủ không xác định khi đăng nhập Google.'}), 500

# --- API Quản lý Người dùng (Admin) ---
def serialize_user(user):
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'google_id': user.google_id
    }

@app.route('/api/users', methods=['GET', 'POST'])
@token_required
@admin_required
def handle_users(current_user):
    if request.method == 'GET':
        try:
            users = User.query.all()
            return jsonify([serialize_user(u) for u in users]), 200
        except Exception as e:
            print_to_stderr(f"Error fetching users: {e}")
            return jsonify({'error': 'Could not fetch users'}), 500

    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        name = data.get('name')
        password = data.get('password')
        role = data.get('role', 'User')
        google_id = data.get('google_id') 

        if not email or not name:
            return jsonify({'error': 'Missing email or name'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409

        if password:
            if len(password) < 6:
                return jsonify({'error': 'Password must be at least 6 characters'}), 400
            password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        else:
             password_hash = None

        new_user = User(
            email=email,
            name=name,
            password_hash=password_hash,
            role=role,
            google_id=google_id if google_id else None,
            drive_access_token=None,
            drive_refresh_token=None
        )
        try:
            db.session.add(new_user)
            db.session.commit()
            return jsonify(serialize_user(new_user)), 201
        except Exception as e:
            print_to_stderr(f"Error creating user: {e}")
            db.session.rollback()
            return jsonify({'error': 'Could not create user'}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    user_to_delete = User.query.get(user_id)
    if not user_to_delete:
        return jsonify({'error': 'User not found'}), 404
    
    if current_user.id == user_to_delete.id and user_to_delete.role == 'Admin':
        admin_count = User.query.filter_by(role='Admin').count()
        if admin_count <= 1:
            return jsonify({'error': 'Cannot delete the last admin account'}), 400
            
    try:
        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        print_to_stderr(f"Error deleting user: {e}")
        db.session.rollback()
        return jsonify({'error': 'Could not delete user'}), 500

@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@token_required
@admin_required
def update_user_role(current_user, user_id):
    data = request.get_json()
    new_role = data.get('role')

    if not new_role or new_role not in ['Admin', 'User']:
        return jsonify({'error': 'Invalid role specified'}), 400

    user_to_update = User.query.get(user_id)
    if not user_to_update:
        return jsonify({'error': 'User not found'}), 404
    
    if current_user.id == user_to_update.id and user_to_update.role == 'Admin':
        admin_count = User.query.filter_by(role='Admin').count()
        if admin_count <= 1 and new_role != 'Admin':
            return jsonify({'error': 'Cannot remove the last admin account'}), 400

    user_to_update.role = new_role
    db.session.commit()
    
    return jsonify(serialize_user(user_to_update)), 200

@app.route('/api/users/change-password', methods=['POST'])
@token_required
@admin_required
def change_password(current_user):
    data = request.get_json()
    new_password = data.get('new_password')

    if not new_password or len(new_password) < 6:
         return jsonify({'error': 'Password must be at least 6 characters'}), 400

    current_user.password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()
    return jsonify({'message': 'Password updated successfully'}), 200


# --- Các API được bảo vệ ---
@app.route('/api/recurring-schedules', methods=['GET', 'POST'])
@token_required
def handle_recurring_schedules(current_user):
    if request.method == 'GET':
        schedules = RecurringSchedule.query.all()
        return jsonify([serialize_recurring(s) for s in schedules]), 200
    
    if request.method == 'POST':
        data = request.get_json()
        try:
            new_schedule = RecurringSchedule(
                school_name=data['schoolName'], class_name=data['className'],
                days_of_week=data['daysOfWeek'], start_time=data['startTime'],
                end_time=data['endTime'], expiry_date=data.get('expiryDate')
            )
            db.session.add(new_schedule)
            db.session.commit()
            return jsonify(serialize_recurring(new_schedule)), 201
        except Exception as e:
            db.session.rollback()
            print_to_stderr(f"ERROR adding recurring schedule: {str(e)}")
            return jsonify({"error": "Lỗi máy chủ: Không thể thêm lịch định kỳ."}), 500

@app.route('/api/recurring-schedules/<int:schedule_id>', methods=['PUT', 'DELETE'])
@token_required
def handle_single_recurring_schedule(current_user, schedule_id):
    schedule = RecurringSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404
        
    if request.method == 'PUT':
        data = request.get_json()
        schedule.school_name = data['schoolName']
        schedule.class_name = data['className']
        schedule.days_of_week = data['daysOfWeek']
        schedule.start_time = data['startTime']
        schedule.end_time = data['endTime']
        schedule.expiry_date = data.get('expiryDate')
        db.session.commit()
        return jsonify(serialize_recurring(schedule)), 200

    if request.method == 'DELETE':
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({"message": "Schedule deleted"}), 200

@app.route('/api/one-off-schedules', methods=['GET', 'POST'])
@token_required
def handle_one_off_schedules(current_user):
    if request.method == 'GET':
        schedules = OneOffSchedule.query.all()
        return jsonify([serialize_one_off(s) for s in schedules]), 200
    
    if request.method == 'POST':
        data = request.get_json()
        try:
            new_schedule = OneOffSchedule(
                school_name=data['schoolName'], class_name=data['className'],
                date=data['date'], start_time=data['startTime'], end_time=data['endTime']
            )
            db.session.add(new_schedule)
            db.session.commit()
            return jsonify(serialize_one_off(new_schedule)), 201
        except Exception as e:
            db.session.rollback()
            print_to_stderr(f"ERROR adding one-off schedule: {str(e)}")
            return jsonify({"error": "Lỗi máy chủ: Không thể thêm lịch đột xuất."}), 500

@app.route('/api/one-off-schedules/<int:schedule_id>', methods=['PUT', 'DELETE'])
@token_required
def handle_single_one_off_schedule(current_user, schedule_id):
    schedule = OneOffSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({"error": "Schedule not found"}), 404
        
    if request.method == 'PUT':
        data = request.get_json()
        schedule.school_name = data['schoolName']
        schedule.class_name = data['className']
        schedule.date = data['date']
        schedule.start_time = data['startTime']
        schedule.end_time = data['endTime']
        db.session.commit()
        return jsonify(serialize_one_off(schedule)), 200

    if request.method == 'DELETE':
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({"message": "Schedule deleted"}), 200

@app.route('/api/video-metadata', methods=['POST'])
@token_required
def video_metadata(current_user):
    data = request.get_json()
    if not data or 'fileId' not in data or 'accessToken' not in data:
        return jsonify({"error": "Thiếu fileId hoặc accessToken"}), 400

    file_id = data['fileId']
    access_token = data['accessToken']
    temp_video_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
            temp_video_path = tmp.name

        headers = {'Authorization': f'Bearer {access_token}'}
        download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        response = requests.get(download_url, headers=headers, stream=True)
        response.raise_for_status()

        with open(temp_video_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        command = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', temp_video_path]
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)
        creation_time = metadata.get('format', {}).get('tags', {}).get('creation_time')
        
        return jsonify({"creation_time": creation_time}), 200
    except Exception as e:
        print_to_stderr(f"LỖI ffprobe: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_video_path and os.path.exists(temp_video_path):
            os.remove(temp_video_path)

# --- Khởi tạo DB và chạy App ---
def create_initial_admin():
    with app.app_context():
        db.create_all()
        
        if not Setting.query.first():
            db.session.add(Setting(client_id='', api_key='', source_folder_id=''))
            db.session.commit()
            print_to_stderr("Tạo các cài đặt mặc định.")

        if not User.query.filter_by(role='Admin').first():
            print_to_stderr("Tạo tài khoản Admin mặc định...")
            hashed_password = generate_password_hash('password', method='pbkdf2:sha256')
            admin = User(
                email='admin',
                name='Admin',
                password_hash=hashed_password,
                role='Admin',
                drive_access_token=None, 
                drive_refresh_token=None
            )
            db.session.add(admin)
            db.session.commit()
            print_to_stderr("Tài khoản Admin đã được tạo.")

def serialize_recurring(s):
    return {
        "id": s.id, "schoolName": s.school_name, "className": s.class_name,
        "daysOfWeek": s.days_of_week, "startTime": s.start_time,
        "endTime": s.end_time, "expiryDate": s.expiry_date
    }

def serialize_one_off(s):
    return {
        "id": s.id, "schoolName": s.school_name, "className": s.class_name,
        "date": s.date, "startTime": s.start_time, "endTime": s.end_time
    }

if __name__ == '__main__':
    create_initial_admin()
    app.run(host='0.0.0.0', port=5001, debug=True)

