import React, { useState, useEffect, useRef } from 'react';

function LoginView({ onAdminLogin, onGoogleLogin, settings, log }) {
  const [loginType, setLoginType] = useState('google');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Ref này chỉ để đảm bảo không khởi tạo lại GSI nhiều lần.
  const isGsiInitialized = useRef(false); 

  useEffect(() => {
    // Chỉ xử lý khi tab Google được chọn và có Client ID
    if (loginType !== 'google' || !settings.client_id) {
      return;
    }

    // Hàm để thiết lập toàn bộ GSI
    const setupGoogleSignIn = () => {
      try {
        if (!window.google || !window.google.accounts) {
          log('Lỗi: Thư viện Google chưa tải xong.', 'error');
          return;
        }

        // 1. Khởi tạo (chỉ một lần)
        if (!isGsiInitialized.current) {
          log(`DEBUG: Đang khởi tạo Google Sign-In với Client ID: [${settings.client_id}]`, 'info');
          const handleGoogleLoginResponse = (response) => {
              console.log('--- GOOGLE CREDENTIAL RESPONSE ---', response);
              log('DEBUG: Đã nhận phản hồi từ Google.', 'success');
              onGoogleLogin(response);
          };
          window.google.accounts.id.initialize({
            client_id: settings.client_id,
            callback: handleGoogleLoginResponse,
            ux_mode: 'popup', 
          });
          isGsiInitialized.current = true;
          log('DEBUG: Khởi tạo Google Sign-In thành công.', 'success');
        }

        // 2. Render nút
        const buttonContainer = document.getElementById('googleSignInButtonContainer');
        // Chỉ render nếu container tồn tại và trống
        if (buttonContainer && buttonContainer.innerHTML.trim() === '') {
           log('DEBUG: Đang render nút Google...', 'info');
           window.google.accounts.id.renderButton(
              buttonContainer,
              { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" }
          );
           log('DEBUG: Render nút Google thành công.', 'success');
        }
      } catch (err) {
        log(`DEBUG: Lỗi nghiêm trọng trong lúc thiết lập GSI: ${err.message}`, 'error');
        console.error("Lỗi GSI:", err);
      }
    };

    // Kiểm tra xem thư viện Google đã tải chưa. Nếu chưa, đợi một chút rồi thử lại.
    // Đây là cách để xử lý việc script được tải bất đồng bộ.
    if (!window.google || !window.google.accounts) {
      log('DEBUG: `window.google` chưa sẵn sàng, sẽ thử lại sau 200ms.', 'warn');
      const timer = setTimeout(setupGoogleSignIn, 200);
      return () => clearTimeout(timer); // Cleanup để tránh memory leak
    } else {
      setupGoogleSignIn();
    }
    
  }, [loginType, settings.client_id, onGoogleLogin, log]);


  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (typeof onAdminLogin === 'function') {
      onAdminLogin(username, password);
    } else {
      console.error("LoginView Prop Error: onAdminLogin is not a function.");
      log("Lỗi hệ thống: Chức năng đăng nhập Admin không khả dụng.", "error");
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-md text-center mt-20">
      <div className="bg-white p-10 rounded-lg shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Đăng nhập</h1>
        
        <div className="flex border-b mb-6">
          <button
            onClick={() => {
                setLoginType('google');
            }}
            className={`w-1/2 py-2 font-semibold transition-colors duration-300 ${loginType === 'google' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          >
            Tài khoản Google
          </button>
          <button
            onClick={() => setLoginType('admin')}
            className={`w-1/2 py-2 font-semibold transition-colors duration-300 ${loginType === 'admin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
          >
            Quản trị viên
          </button>
        </div>

        {loginType === 'google' ? (
          <div>
            <p className="text-gray-600 mb-6">Sử dụng tài khoản Google của bạn để truy cập các tính năng.</p>
            {settings.client_id ? (
              <div id="googleSignInButtonContainer" className="flex justify-center h-10"></div>
            ) : (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded" role="alert">
                <p>Chức năng đăng nhập Google chưa được cấu hình. Vui lòng liên hệ Quản trị viên.</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Tên đăng nhập (mặc định: admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Mật khẩu (mặc định: password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Đăng nhập
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginView;

