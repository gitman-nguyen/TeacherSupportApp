import { useState, useEffect, useCallback } from 'react';

export const useSettings = (fetchApiData, log) => {
  const [settings, setSettings] = useState({ client_id: '', api_key: '', source_folder_id: '' });
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

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

  const handleSettingsChange = useCallback((e) => {
    const { name, value } = e.target;
    setSettings(prev => ({...prev, [name]: value}));
  }, []);

  const handleSaveSettings = useCallback(async (currentUser) => {
    try {
      await fetchApiData('/settings', 'POST', settings, currentUser?.apiToken);
      log('Lưu cài đặt thành công!', 'success');
    } catch (error) {
      log(`Lỗi lưu cài đặt: ${error.message}`, 'error');
    }
  }, [settings, fetchApiData, log]);

  return {
    settings,
    setSettings,
    isSettingsLoading,
    handleSettingsChange,
    handleSaveSettings
  };
};

