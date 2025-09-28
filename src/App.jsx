import React, { useState, useEffect, useRef, useCallback } from 'react';

// CÁC FILE CON: ĐÃ CẬP NHẬT ĐƯỜNG DẪN THEO CẤU TRÚC src/views/
import LoginView from './views/Login/LoginView.jsx'; 
import SettingsView from './views/Settings/SettingsView.jsx';
import ScheduleView from './views/Schedule/ScheduleView.jsx';
import OrganizerView from './views/Organizer/OrganizerView.jsx';
import AdminView from './views/Admin/AdminView.jsx'; 
import PhotoGalleryView from './views/PhotoGallery/PhotoGalleryView.jsx';

// Import các hàm và hằng số (src/utils/)
// THAY ĐỔI 1: Xóa bỏ BACKEND_URL vì không còn cần thiết
// import { BACKEND_URL } from './utils/constants.js'; 
import { calculateHammingDistance } from './utils/helpers.js'; 

// --- Main App Component ---
function App() {
  const [view, setView] = useState('schedule');
  const [settings, setSettings] = useState({ client_id: '', api_key: '', source_folder_id: '' });
  const [recurringSchedule, setRecurringSchedule] = useState([]);
  const [oneOffSchedule, setOneOffSchedule] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null); 

  const [timeField, setTimeField] = useState('exifTime');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(5);
  const [filterUnclearSubject, setFilterUnclearSubject] = useState(true);
  const [filterDarkFace, setFilterDarkFace] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [origin, setOrigin] = useState('');
  const [concurrencyLevel, setConcurrencyLevel] = useState(5);
  const [imageAnalyzer, setImageAnalyzer] = useState(null);

  const logContainerRef = useRef(null);

  const log = useCallback((message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time: now }]);
  }, []);
    
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

  // THAY ĐỔI 2: Cập nhật hàm fetchApiData để sử dụng đường dẫn tương đối qua proxy
  const fetchApiData = useCallback(async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['x-access-token'] = token;
    }
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    // URL giờ đây là một đường dẫn tương đối, bắt đầu bằng /api.
    // Vite Dev Server sẽ bắt lấy request này và proxy nó đến backend.
    const url = `/api${endpoint}`;
    
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    // Xử lý trường hợp response có thể không có body
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }, []);

  useEffect(() => {
    const fetchInitialSettings = async () => {
        try {
            const settingsData = await fetchApiData('/settings');
            setSettings({
                client_id: settingsData.client_id || '',
                api_key: settingsData.api_key || '',
                source_folder_id: settingsData.source_folder_id || ''
            });
        } catch (error) {
            log(`Lỗi tải cài đặt: ${error.message}`, 'error');
            setSettings({ client_id: '', api_key: '', source_folder_id: '' });
        } finally {
            setIsSettingsLoading(false);
        }
    };
    fetchInitialSettings();
  }, [log, fetchApiData]);
  
  const saveDriveAccessToken = useCallback(async (token, apiToken) => {
      if (!apiToken) {
          log('Lỗi: Thiếu API Token để xác thực với backend.', 'error');
          return;
      }
      log('Đang lưu Access Token Drive vào hồ sơ người dùng...', 'info');
      try {
          await fetchApiData('/save_drive_token', 'POST', { access_token: token }, apiToken);
          log('Lưu Access Token Drive thành công.', 'success');
      } catch (error) {
          log(`Lỗi lưu Access Token Drive: ${error.message}`, 'error');
      }
  }, [log, fetchApiData]);

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
                saveDriveAccessToken(tokenResponse.access_token, userApiToken);
                log('Đã có quyền truy cập Google Drive!', 'success');
            },
        });
        
        client.requestAccessToken({ prompt: 'consent' }); 

    } catch (err) {
        log(`Lỗi khởi tạo OAuth2 Client: ${err.message}`, 'error');
    }
  }, [settings?.client_id, log, saveDriveAccessToken]);


  useEffect(() => {
    if (currentUser) {
        const fetchSchedules = async () => {
            try {
                const [recurringRes, oneOffRes] = await Promise.all([
                    fetchApiData('/recurring-schedules', 'GET', null, currentUser.apiToken),
                    fetchApiData('/one-off-schedules', 'GET', null, currentUser.apiToken)
                ]);
                setRecurringSchedule(recurringRes);
                setOneOffSchedule(oneOffRes.sort((a, b) => new Date(a.date) - new Date(b.date)));
                log('Tải dữ liệu lịch học thành công.', 'success');
                
            } catch (error) {
                 log(`Lỗi tải lịch học: ${error.message}`, 'error');
            }
        };
        fetchSchedules();
        if (!accessToken && currentUser.role !== 'Admin') {
            requestDriveAccessToken(currentUser.apiToken);
        }
    }
  }, [currentUser, log, fetchApiData, accessToken, requestDriveAccessToken]);
    
  useEffect(() => {
    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
        const scriptElement = document.getElementById(scriptId);
        if (scriptElement && document.body.contains(scriptElement)) {
            document.body.removeChild(scriptElement);
        }
    };
  }, []);

  useEffect(() => { setOrigin(window.location.origin) }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleAdminLogin = useCallback(async (username, password) => {
    log('Đang đăng nhập Admin...', 'info');
    try {
        const adminData = await fetchApiData('/auth/login', 'POST', { username, password });
        if (adminData && adminData.apiToken) {
            setCurrentUser(adminData);
            localStorage.setItem('currentUser', JSON.stringify(adminData));
            localStorage.setItem('apiToken', adminData.apiToken);
            setView('settings');
            log('Đăng nhập Admin thành công!', 'success');
        } else {
            throw new Error(adminData.error || 'Phản hồi đăng nhập không hợp lệ.');
        }
    } catch(error) {
        log(`Lỗi đăng nhập Admin: ${error.message}`, 'error');
        localStorage.clear();
    }
  }, [log, fetchApiData]);
  
  const handleGoogleLogin = useCallback(async (response) => {
    log('Đang xác thực Google với server (ID Token)...', 'info');
    try {
        const loginResponse = await fetchApiData('/auth/google-login', 'POST', { token: response.credential });
        
        if (loginResponse && loginResponse.apiToken) {
            const userData = { ...loginResponse };
            setCurrentUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('apiToken', loginResponse.apiToken);
            
            log(`Chào mừng ${loginResponse.name}!`, 'success');
            setView('schedule');
        } else {
            throw new Error(loginResponse.error || 'Phản hồi đăng nhập Google không hợp lệ.');
        }

    } catch (error) {
        log(`Lỗi đăng nhập Google: ${error.message}`, 'error');
        setCurrentUser(null);
        localStorage.clear();
    }
  }, [log, fetchApiData]);

  const handleLogout = () => {
      setCurrentUser(null);
      setAccessToken(null);
      localStorage.clear();
      setView('schedule');
      log('Đã đăng xuất.', 'info');
  };

  const handleSettingsChange = (e) => {
      const { name, value } = e.target;
      setSettings(prev => ({...prev, [name]: value}));
  };

  const handleSaveSettings = async () => {
        try {
            await fetchApiData('/settings', 'POST', settings, currentUser?.apiToken);
            log('Lưu cài đặt thành công!', 'success');
        } catch (error) {
            log(`Lỗi lưu cài đặt: ${error.message}`, 'error');
        }
    };
  
  const getDriveAccessToken = useCallback(() => {
    if (!settings?.client_id) {
        log('Chưa có Client ID để kết nối Google Drive.', 'error');
        return;
    }
    requestDriveAccessToken(currentUser?.apiToken);
  }, [settings?.client_id, log, currentUser?.apiToken, requestDriveAccessToken]);
  
    const getVideoCreationTime = useCallback(async (fileId) => {
        const driveToken = accessToken; 
        if (!driveToken) {
            log('Lỗi: Thiếu Access Token Google Drive khi lấy metadata video.', 'error');
            return null;
        }

        try {
            const data = await fetchApiData('/video-metadata', 'POST', { fileId, accessToken: driveToken }, currentUser?.apiToken);
            return data.creation_time;
        } catch (error) {
            log(`Lỗi khi lấy metadata video: ${error.message}. Vui lòng kiểm tra backend và token.`, 'error');
            return null;
        }
    }, [accessToken, log, fetchApiData, currentUser?.apiToken]); 
  
    const toYYYYMMDD = (date) => new Date(date).toISOString().split('T')[0];
    
    const getUsers = useCallback(async () => {
        if (!currentUser?.apiToken) throw new Error("Chưa xác thực hoặc thiếu token API.");
        return await fetchApiData('/users', 'GET', null, currentUser.apiToken);
    }, [currentUser?.apiToken, fetchApiData]);

    const createUser = useCallback(async (userData) => {
        if (!currentUser?.apiToken) throw new Error("Chưa xác thực hoặc thiếu token API.");
        return await fetchApiData('/users', 'POST', userData, currentUser.apiToken);
    }, [currentUser?.apiToken, fetchApiData]);

    const deleteUser = useCallback(async (userId) => {
        if (!currentUser?.apiToken) throw new Error("Chưa xác thực hoặc thiếu token API.");
        await fetchApiData(`/users/${userId}`, 'DELETE', null, currentUser.apiToken);
    }, [currentUser?.apiToken, fetchApiData]);
    
    const updateUserRole = useCallback(async (userId, newRole) => {
        if (!currentUser?.apiToken) throw new Error("Chưa xác thực hoặc thiếu token API.");
        return await fetchApiData(`/users/${userId}/role`, 'PUT', { role: newRole }, currentUser.apiToken);
    }, [currentUser?.apiToken, fetchApiData]);

    const organizePhotos = useCallback(async () => {
      if (!imageAnalyzer) {
          log('Lỗi: Bộ phân tích AI chưa sẵn sàng. Vui lòng đợi model tải xong rồi thử lại.', 'error');
          setIsProcessing(false);
          return;
      }

      if (!accessToken) {
          log('Cảnh báo: Frontend chưa có Access Token Drive. Đang thử dựa vào token DB...', 'warn');
      }

      if (!currentUser?.apiToken) {
          log('Lỗi: Thiếu API Token xác thực.', 'error'); setIsProcessing(false); return;
      }
      
      log(`Bắt đầu quá trình sắp xếp...`);
      setIsProcessing(true); setProgress(0);
      
      const apiKey = settings?.api_key; 
      if (!apiKey) {
          log('Lỗi: Google API Key chưa được cấu hình trong Cài đặt.', 'error');
          setIsProcessing(false);
          return;
      }
  
      const getFolderIdFromInput = (input) => {
        const match = input.match(/[-\w]{25,}/);
        if (match && match[0] !== input) {
          log(`Đã tự động trích xuất ID thư mục từ URL: ${match[0]}`, 'info');
          return match[0];
        }
        return input;
      };

      const driveApi = async (path, method = 'GET', body = null) => {
          const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
          const url = `https://www.googleapis.com/drive/v3/${path}${path.includes('?') ? '&' : '?'}key=${apiKey}`; 
          const options = { method, headers };
          if (body) options.body = JSON.stringify(body);
          
          if (!accessToken) {
             throw new Error("Drive Access Token bị thiếu. Vui lòng cấp quyền Drive.");
          }

          const response = await fetch(url, options);
          if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                  handleAuthError();
              }
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error?.message || `Lỗi API: ${response.status}`);
          }
          return response.json();
      };
      
      const downloadDriveFileAsBlob = async (fileId) => {
          const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
          const headers = { 'Authorization': `Bearer ${accessToken}` };
          const response = await fetch(url, { headers });
           if (!response.ok) {
              if (response.status === 401 || response.status === 403) {
                  handleAuthError();
              }
              const errorText = await response.text();
              throw new Error(`Lỗi tải file ${fileId}: ${response.status} ${errorText}`);
          }
          return response.blob();
      };
      
      try {
          const actualFolderId = getFolderIdFromInput(settings.source_folder_id);
          
          const listFiles = async (folderId) => {
              let files = [];
              let pageToken = '';
              const requiredFields = 'id, name, createdTime, modifiedTime, imageMediaMetadata(time), mimeType, parents';
              do {
                  const params = new URLSearchParams({
                      q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
                      fields: `nextPageToken, files(${requiredFields})`, pageSize: 100,
                  });
                  if (pageToken) params.append('pageToken', pageToken);
                  const data = await driveApi(`files?${params.toString()}`);
                  if (data.files) files = files.concat(data.files);
                  pageToken = data.nextPageToken;
              } while (pageToken);
              return files;
          };
  
          const findOrCreateFolder = async (folderName, parentId) => {
              const params = new URLSearchParams({
                  q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed = false`,
                  fields: 'files(id)', pageSize: 1,
              });
              const search = await driveApi(`files?${params.toString()}`);
              if (search.files?.length > 0) return search.files[0].id;
              log(`Đang tạo thư mục mới: '${folderName}'...`, 'warn');
              return (await driveApi('files', 'POST', { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })).id;
          };
  
          const moveFile = (fileId, oldParentId, newParentId) => {
              const params = new URLSearchParams({ addParents: newParentId, removeParents: oldParentId, fields: 'id, parents' });
              return driveApi(`files/${fileId}?${params.toString()}`, 'PATCH');
          };
  
          const allFiles = await listFiles(actualFolderId);
          log(`Tìm thấy ${allFiles.length} file (ảnh & video). Bắt đầu phân loại...`);
          if (allFiles.length === 0) { setIsProcessing(false); return; }
  
          const destinationFolders = {};
          let processedHashes = [];
          let filesProcessed = 0;
          const analyzerFunc = imageAnalyzer();
  
          for (let i = 0; i < allFiles.length; i += concurrencyLevel) {
              const batch = allFiles.slice(i, i + concurrencyLevel);
              const promises = batch.map(async (file) => {
                  try {
                      let timestamp;
                      let timestampSource = '';
                      
                      if (file.mimeType.startsWith('video/')) {
                          const videoCreationTime = await getVideoCreationTime(file.id);
                          if (videoCreationTime) {
                              timestamp = videoCreationTime;
                              timestampSource = 'Ngày quay (Video)';
                          } else {
                              timestamp = file.createdTime;
                              timestampSource = 'Ngày tạo (Video)';
                          }
                      } else { 
                          if (timeField === 'exifTime' && file.imageMediaMetadata?.time) {
                              timestamp = file.imageMediaMetadata.time.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                              timestampSource = 'Ngày chụp (EXIF)';
                          } else {
                              timestamp = file[timeField] || file.createdTime;
                              timestampSource = timeField === 'createdTime' ? 'Ngày tạo' : 'Ngày chỉnh sửa';
                          }
                      }
                      
                      const fileDate = new Date(timestamp);
                      if (isNaN(fileDate.getTime())) {
                          log(`Bỏ qua '${file.name}': giá trị thời gian không hợp lệ.`, 'warn');
                          return;
                      }
                      log(`Sử dụng ${timestampSource}: ${fileDate.toLocaleString('vi-VN')} cho file '${file.name}'.`, 'info');
  
                      const fileTime = fileDate.toTimeString().slice(0, 5);
                      const fileDateString = toYYYYMMDD(fileDate);
                      let fileDayOfWeek = fileDate.getDay();
                      if (fileDayOfWeek === 0) fileDayOfWeek = 7;
  
                      let matchingEntry = oneOffSchedule.find(entry =>
                          fileDateString === entry.date && fileTime >= entry.startTime && fileTime <= entry.endTime
                      );
                      if (!matchingEntry) {
                          matchingEntry = recurringSchedule.find(entry => {
                              const isDayMatch = entry.daysOfWeek.includes(String(fileDayOfWeek));
                              const isTimeMatch = fileTime >= entry.startTime && fileTime <= entry.endTime;
                              const isNotExpired = !entry.expiryDate || fileDate <= new Date(entry.expiryDate + 'T23:59:59');
                              return isDayMatch && isTimeMatch && isNotExpired;
                          });
                      }
                      
                      if (!matchingEntry) {
                          log(`'${file.name}' không khớp lịch học.`, 'info');
                          return;
                      }
                      
                      const folderName = `${matchingEntry.schoolName} - ${matchingEntry.className}`;
                      if (!destinationFolders[folderName]) {
                          destinationFolders[folderName] = {
                              idPromise: findOrCreateFolder(folderName, actualFolderId),
                              selectedIdPromise: null
                          };
                      }
                      const parentFolderId = await destinationFolders[folderName].idPromise;
  
                      if (!file.mimeType.startsWith('image/')) {
                          await moveFile(file.id, actualFolderId, parentFolderId);
                          log(`Đã phân loại '${file.name}' vào '${folderName}'.`, 'info');
                          return;
                      }
                      
                      const imageBlob = await downloadDriveFileAsBlob(file.id);
                      const analysisResult = await analyzerFunc(imageBlob, file.name);
                      let meetsCriteria = true;
  
                      if (!analysisResult || analysisResult.error) {
                          meetsCriteria = false;
                          log(` -> Bỏ qua (Không tìm thấy khuôn mặt): '${file.name}'.`, 'warn');
                      } else {
                           if (removeDuplicates) {
                              const newHash = analysisResult.hash;
                              const isSimilar = processedHashes.some(
                                  (existingHash) => 
                                      (calculateHammingDistance(newHash, existingHash) <= similarityThreshold)
                              );
                              if (isSimilar) {
                                   meetsCriteria = false;
                                   log(` -> Loại (tương tự): '${file.name}'.`, 'error');
                              } else {
                                  processedHashes = [...processedHashes, newHash]; 
                              }
                          }
                          if (meetsCriteria && filterUnclearSubject) {
                             if (analysisResult.sharpness < 50) { 
                                meetsCriteria = false;
                                log(` -> Loại (không rõ nét): '${file.name}' (Sharpness: ${analysisResult.sharpness.toFixed(2)}).`, 'error');
                             }
                          }
                          if (meetsCriteria && filterDarkFace) {
                              if (analysisResult.brightness < 85) { 
                                meetsCriteria = false;
                                log(` -> Loại (mặt tối): '${file.name}' (Brightness: ${analysisResult.brightness.toFixed(2)}).`, 'error');
                              }
                          }
                      }
  
                      if (meetsCriteria) {
                          if (!destinationFolders[folderName].selectedIdPromise) {
                              destinationFolders[folderName].selectedIdPromise = findOrCreateFolder('Selected Items', await parentFolderId);
                          }
                          const selectedDestId = await destinationFolders[folderName].selectedIdPromise;
                          await moveFile(file.id, actualFolderId, selectedDestId);
                          log(` -> ĐÃ CHỌN: '${file.name}' vào 'Selected Items'.`, 'success');
                      } else {
                          await moveFile(file.id, actualFolderId, parentFolderId);
                          log(` -> Đã phân loại '${file.name}' vào thư mục cha '${folderName}'.`, 'info');
                      }
                  } catch (err) {
                      log(`Lỗi khi xử lý file '${file.name}': ${err.message}`, 'error');
                  }
              });
  
              await Promise.allSettled(promises);
              filesProcessed += batch.length;
              setProgress(Math.round((filesProcessed / allFiles.length) * 100));
          }
  
          log('Hoàn tất quá trình sắp xếp!', 'success');
          
      } catch (error) {
          log(`Đã xảy ra lỗi nghiêm trọng: ${error.message}`, 'error');
          if (error.message.includes('Drive Access Token bị thiếu') || error.message.includes('Lỗi API: 401')) {
              log('Token Drive bị Google từ chối. Vui lòng cấp quyền lại.', 'error');
              setAccessToken(null); 
          }
      } finally {
          setIsProcessing(false);
      }

    }, [settings.source_folder_id, log, accessToken, timeField, removeDuplicates, filterUnclearSubject, filterDarkFace, similarityThreshold, imageAnalyzer, recurringSchedule, oneOffSchedule, getVideoCreationTime, concurrencyLevel, settings?.api_key, currentUser?.apiToken, handleAuthError]); 
  
  const renderLog = () => {
    const colorMap = {
      info: 'text-gray-300', success: 'text-green-400', error: 'text-red-400', warn: 'text-yellow-400',
    };
    return logs.map((log, index) => (
      <p key={index} className={`font-mono text-sm ${colorMap[log.type] || 'text-gray-300'}`}>
        <span className="text-gray-500">[{log.time}]</span> {log.message}
      </p>
    ));
  };
  
  const organizerProps = {
    settings,
    timeField, setTimeField,
    removeDuplicates, setRemoveDuplicates,
    similarityThreshold, setSimilarityThreshold,
    filterUnclearSubject, setFilterUnclearSubject,
    filterDarkFace, setFilterDarkFace,
    isProcessing, progress, 
    currentUser,
    organizePhotos,
    logs, logContainerRef, renderLog,
    concurrencyLevel, setConcurrencyLevel,
    isSignedIn: !!accessToken,
    getDriveToken: getDriveAccessToken,
    onAnalyzerReady: setImageAnalyzer,
    isAnalyzerReady: !!imageAnalyzer,
  };
  
  const settingsProps = {
    settings,
    handleSettingsChange,
    handleSave: handleSaveSettings,
    origin,
    logs,
    logContainerRef,
    renderLog,
  };
  
  const adminProps = {
    currentUser, 
    log, 
    fetchUsers: getUsers, 
    deleteUser, 
    createUser,
    updateUserRole,
  };

  if (isSettingsLoading) {
      return <div className="flex justify-center items-center h-screen text-xl">Đang tải cấu hình...</div>;
  }
  
  if (!currentUser) {
      return <LoginView onAdminLogin={handleAdminLogin} onGoogleLogin={handleGoogleLogin} settings={settings} log={log} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <header className="bg-white p-4 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Trình Sắp Xếp Ảnh Google Drive</h1>
                    <p className="text-gray-600">Xin chào, {currentUser.name} ({currentUser.role})</p>
                </div>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
                    Đăng xuất
                </button>
            </div>
        </header>

        <div className="flex justify-center border-b mb-8 space-x-2">
            <button onClick={() => setView('schedule')} className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${view === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Lịch học</button>
            <button onClick={() => setView('gallery')} className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${view === 'gallery' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Thư viện ảnh</button>
            <button onClick={() => setView('organizer')} className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${view === 'organizer' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Sắp xếp</button>
            {currentUser.role === 'Admin' && (
                <>
                    <button onClick={() => setView('settings')} className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${view === 'settings' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Cài đặt</button>
                    <button onClick={() => setView('admin')} className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${view === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Quản trị</button>
                </>
            )}
        </div>

        <div className="main-content">
            {view === 'schedule' && <ScheduleView recurringSchedule={recurringSchedule} setRecurringSchedule={setRecurringSchedule} oneOffSchedule={oneOffSchedule} setOneOffSchedule={setOneOffSchedule} log={log} currentUser={currentUser}/>}
            {/* THAY ĐỔI 3: Xóa bỏ backendUrl prop không còn cần thiết */}
            {view === 'gallery' && <PhotoGalleryView accessToken={accessToken} apiKey={settings?.api_key} sourceFolderId={settings?.source_folder_id} log={log} getVideoCreationTime={getVideoCreationTime} getDriveToken={getDriveAccessToken} onAuthError={handleAuthError} />}
            {view === 'organizer' && <OrganizerView {...organizerProps} />} 
            {currentUser.role === 'Admin' && view === 'settings' && <SettingsView {...settingsProps} />}
            {currentUser.role === 'Admin' && view === 'admin' && <AdminView {...adminProps} />}
        </div>
    </div>
  );
}

export default App;

