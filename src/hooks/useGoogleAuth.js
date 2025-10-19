import { useEffect, useCallback } from 'react';

export const useGoogleAuth = (settings, currentUser, accessToken, setAccessToken, saveDriveAccessToken, log) => {
  const requestDriveAccessToken = useCallback((userApiToken) => {
    if (!settings?.client_id) {
      log('Chưa có Client ID để kết nối Google Drive.', 'error');
      return;
    }
    
    log('Yêu cầu cấp quyền Google Drive...', 'info');
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: settings.client_id,
        scope: 'https://www.googleapis.com/auth/drive', 
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            log(`Lỗi lấy quyền truy cập Drive: ${tokenResponse.error}. Vui lòng thử lại.`, 'error');
            setAccessToken(null);
            localStorage.removeItem('accessToken');
            return;
          }
          
          setAccessToken(tokenResponse.access_token);
          localStorage.setItem('accessToken', tokenResponse.access_token);
          
          saveDriveAccessToken(tokenResponse, userApiToken);
          
          log('Đã có quyền truy cập Google Drive!', 'success');
        },
      });
      
      client.requestAccessToken({ prompt: 'consent' }); 

    } catch (err) {
      log(`Lỗi khởi tạo OAuth2 Client: ${err.message}`, 'error');
    }
  }, [settings?.client_id, log, setAccessToken, saveDriveAccessToken]);

  const getDriveAccessToken = useCallback(() => {
    if (!settings?.client_id) {
      log('Chưa có Client ID để kết nối Google Drive.', 'error');
      return;
    }
    requestDriveAccessToken(currentUser?.apiToken);
  }, [settings?.client_id, log, currentUser?.apiToken, requestDriveAccessToken]);

  useEffect(() => {
    if (currentUser && !accessToken && currentUser.role !== 'Admin') {
      requestDriveAccessToken(currentUser.apiToken);
    }
  }, [currentUser, accessToken, requestDriveAccessToken]);

  return { getDriveAccessToken };
};

