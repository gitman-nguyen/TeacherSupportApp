import { useCallback } from 'react';

export const useApi = (log, handleLogout) => {
  const fetchApiData = useCallback(async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['x-access-token'] = token;
    }
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const url = `/api${endpoint}`;
    
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 401) {
        log('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', 'error');
        handleLogout(); 
      }
      const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server' }));
      throw new Error(errorData.error || `Yêu cầu thất bại với mã trạng thái ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }, [log, handleLogout]);

  return { fetchApiData };
};

