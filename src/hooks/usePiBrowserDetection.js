import { useState, useEffect } from 'react';

export const usePiBrowserDetection = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Détection Pi Browser
    const checkPiBrowser = () => {
      const pi = window.Pi;
      const isPi = !!pi;
      setIsPiBrowser(isPi);
      
      // Détection mobile
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      
      console.log('📱 Détection:', {
        isPiBrowser: isPi,
        isMobile: isMobileDevice,
        userAgent: navigator.userAgent
      });
      
      return isPi;
    };

    checkPiBrowser();
  }, []);

  return { isPiBrowser, isMobile };
};