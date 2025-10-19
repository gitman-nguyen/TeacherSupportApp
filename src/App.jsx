import React, { useState, useEffect, useRef, useCallback } from 'react';

// CÁC FILE CON
import LoginView from './views/Login/LoginView.jsx';
import SettingsView from './views/Settings/SettingsView.jsx';
import ScheduleView from './views/Schedule/ScheduleView.jsx';
import OrganizerView from './views/Organizer/OrganizerView.jsx';
import AdminView from './views/Admin/AdminView.jsx';
import PhotoGalleryView from './views/PhotoGallery/PhotoGalleryView.jsx';

// Import components tối ưu
import Header from './components/Header.jsx';
import Navigation from './components/Navigation.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

// Import custom hooks
import { useAuth } from './hooks/useAuth.js';
import { useApi } from './hooks/useApi.js';
import { useSettings } from './hooks/useSettings.js';
import { useSchedules } from './hooks/useSchedules.js';
import { useGoogleAuth } from './hooks/useGoogleAuth.js';
import { useGoogleScript } from './hooks/useGoogleScript.js';
import { useLogs } from './hooks/useLogs.js';

// Import các hàm và hằng số
import { calculateHammingDistance } from './utils/helpers.js';

// --- Main App Component ---
function App() {
  const [view, setView] = useState('schedule');
  const [timeField, setTimeField] = useState('exifTime');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(5);
  const [filterUnclearSubject, setFilterUnclearSubject] = useState(true);
  const [filterDarkFace, setFilterDarkFace] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [origin, setOrigin] = useState('');
  const [concurrencyLevel, setConcurrencyLevel] = useState(5);
  // imageAnalyzer WILL hold the actual analyzer function (imageBlob, fileName) => Promise<analysis>
  const [imageAnalyzer, setImageAnalyzer] = useState(null);

  // Custom hooks
  const { currentUser, setCurrentUser, accessToken, setAccessToken, handleLogout, handleAuthError, log } = useAuth();
  const { fetchApiData } = useApi(log, handleLogout);
  const { settings, setSettings, isSettingsLoading, handleSettingsChange, handleSaveSettings } = useSettings(fetchApiData, log);
  const { recurringSchedule, setRecurringSchedule, oneOffSchedule, setOneOffSchedule } = useSchedules(currentUser, fetchApiData, log);
  const { logs, logContainerRef, renderLog } = useLogs();
  
  // Load Google Script
  useGoogleScript();

  // Google Auth hook
  const { getDriveAccessToken } = useGoogleAuth(settings, currentUser, accessToken, setAccessToken, saveDriveAccessToken, log);

  // Save Drive Access Token function
  const saveDriveAccessToken = useCallback(async (tokenData, apiToken) => {
    if (!apiToken) {
        log('Lỗi: Thiếu API Token để xác thực với backend.', 'error');
        return;
    }
    log('Đang lưu Access Token Drive vào hồ sơ người dùng...', 'info');
    try {
        await fetchApiData('/save_drive_token', 'POST', { 
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token 
        }, apiToken);
        log('Lưu Access Token Drive thành công.', 'success');
    } catch (error) {
        log(`Lỗi lưu Access Token Drive: ${error.message}`, 'error');
    }
  }, [log, fetchApiData]);

  useEffect(() => { 
    setOrigin(window.location.origin) 
  }, []);

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
    
    // ------------------
    // NORMALIZE / REGISTER ANALYZER
    // ------------------
    // We accept two possible call shapes from OrganizerView:
    // 1) onAnalyzerReady(analyzeImage)           -> analyzer function passed directly
    // 2) onAnalyzerReady(() => analyzeImage)     -> factory that returns the analyzer
    // This helper will normalize and store the actual analyzer function in state.
    const registerAnalyzer = useCallback((analyzerFactory) => {
      if (typeof analyzerFactory !== 'function') {
        log('onAnalyzerReady received non-function. Không đăng ký analyzer.', 'error');
        console.error('[App.jsx] registerAnalyzer: expected function, got:', analyzerFactory);
        return;
      }
      try {
        const analyzer = (analyzerFactory.length === 0) ? analyzerFactory() : analyzerFactory;
        if (typeof analyzer !== 'function') {
          log('onAnalyzerReady did not return a valid function. Không đăng ký analyzer.', 'error');
          console.error('[App.jsx] registerAnalyzer: returned value is not function:', analyzer);
          return;
        }
        // store the analyzer function as state value; wrap in arrow so React doesn't treat it as updater
        setImageAnalyzer(() => analyzer);
        log('Bộ phân tích AI đã đăng ký thành công.', 'success');
      } catch (err) {
        log(`Lỗi khi đăng ký bộ phân tích AI: ${err.message}`, 'error');
        console.error('[App.jsx] registerAnalyzer error:', err);
      }
    }, [log]);

    // ------------------
    // MAIN ORGANIZE FUNCTION
    // ------------------
    const organizePhotos = useCallback(async () => {
      // Normalize imageAnalyzer into an actual analyzer function that accepts (blob, fileName)
      let analyzerFunc = null;
      if (typeof imageAnalyzer === 'function') {
        // If imageAnalyzer was stored directly as analyzer (arity >= 1), use it.
        // If it is a zero-arg factory (unexpected but possible), call it once.
        analyzerFunc = (imageAnalyzer.length === 0) ? imageAnalyzer() : imageAnalyzer;
      }

      if (typeof analyzerFunc !== 'function') {
          log('Lỗi: Bộ phân tích AI chưa sẵn sàng hoặc không phải là một hàm. Vui lòng đợi model tải xong rồi thử lại.', 'error');
          console.error('[App.jsx] LỖI NGHIÊM TRỌNG: analyzerFunc không phải là một hàm.', analyzerFunc);
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
                          log(` -> Bỏ qua (${analysisResult?.error || 'lỗi không xác định'}): '${file.name}'.`, 'warn');
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
    // use our normalization wrapper so the parent always receives the analyzer function correctly
    onAnalyzerReady: registerAnalyzer,
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
      return <LoadingSpinner message="Đang tải cấu hình..." />;
  }
  
  if (!currentUser) {
      return <LoginView onAdminLogin={handleAdminLogin} onGoogleLogin={handleGoogleLogin} settings={settings} log={log} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Header currentUser={currentUser} onLogout={handleLogout} />
        <Navigation currentView={view} onViewChange={setView} currentUser={currentUser} />

        <div className="main-content">
            {view === 'schedule' && <ScheduleView recurringSchedule={recurringSchedule} setRecurringSchedule={setRecurringSchedule} oneOffSchedule={oneOffSchedule} setOneOffSchedule={setOneOffSchedule} log={log} currentUser={currentUser}/>}
            {view === 'gallery' && <PhotoGalleryView accessToken={accessToken} apiKey={settings?.api_key} sourceFolderId={settings?.source_folder_id} log={log} getVideoCreationTime={getVideoCreationTime} getDriveToken={getDriveAccessToken} onAuthError={handleAuthError} />}
            {view === 'organizer' && <OrganizerView {...organizerProps} />} 
            {currentUser.role === 'Admin' && view === 'settings' && <SettingsView {...settingsProps} />}
            {currentUser.role === 'Admin' && view === 'admin' && <AdminView {...adminProps} />}
        </div>
    </div>
  );
}

export default App