import { useState, useEffect, useCallback } from 'react';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const log = useCallback((message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] ${type.toUpperCase()}: ${message}`);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAccessToken(null);
    localStorage.clear();
    log('Đã đăng xuất.', 'info');
  }, [log]);

  const handleAuthError = useCallback(() => {
    log('Lỗi xác thực Google Drive hoặc phiên đã hết hạn. Yêu cầu cấp quyền lại.', 'error');
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  }, [log]);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('apiToken');
    const storedAccessToken = localStorage.getItem('accessToken');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        user.apiToken = storedToken; 
        setCurrentUser(user);
        log('Đã khôi phục phiên đăng nhập.', 'info');
        if (storedAccessToken) {
          setAccessToken(storedAccessToken);
          log('Đã khôi phục quyền truy cập Google Drive.', 'info');
        }
      } catch (e) {
        log('Lỗi khôi phục phiên, vui lòng đăng nhập lại.', 'error');
        localStorage.clear();
      }
    }
  }, [log]);

  return {
    currentUser,
    setCurrentUser,
    accessToken,
    setAccessToken,
    handleLogout,
    handleAuthError,
    log
  };
};

