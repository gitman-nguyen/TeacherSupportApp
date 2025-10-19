import { useEffect } from 'react';

export const useGoogleScript = () => {
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
};

