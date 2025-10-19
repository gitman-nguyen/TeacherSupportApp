import { useState, useEffect, useRef, useCallback } from 'react';

export const useLogs = () => {
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);

  const log = useCallback((message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time: now }]);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const renderLog = useCallback(() => {
    const colorMap = {
      info: 'text-gray-300', 
      success: 'text-green-400', 
      error: 'text-red-400', 
      warn: 'text-yellow-400',
    };
    return logs.map((log, index) => (
      <p key={index} className={`font-mono text-sm ${colorMap[log.type] || 'text-gray-300'}`}>
        <span className="text-gray-500">[{log.time}]</span> {log.message}
      </p>
    ));
  }, [logs]);

  return {
    logs,
    log,
    logContainerRef,
    renderLog
  };
};

