// hooks/usePiDetection.js - VERSION CORRIGÉE
import { useState, useEffect } from 'react';

export const usePiDetection = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isPiLoaded, setIsPiLoaded] = useState(false);

  useEffect(() => {
    const checkPiEnvironment = () => {
      // Vérification plus robuste du Pi Browser
      const userAgent = navigator.userAgent.toLowerCase();
      const isPiBrowserDetected = 
        userAgent.includes('pi browser') || 
        userAgent.includes('minepi') ||
        window.location.hostname.includes('minepi.com') ||
        typeof window.Pi !== 'undefined';

      setIsPiBrowser(isPiBrowserDetected);

      // Vérification asynchrone du SDK
      if (typeof window.Pi !== 'undefined') {
        setIsPiLoaded(true);
      } else {
        // Attendre que le SDK se charge
        const checkSDK = setInterval(() => {
          if (typeof window.Pi !== 'undefined') {
            setIsPiLoaded(true);
            clearInterval(checkSDK);
          }
        }, 100);

        // Timeout après 5 secondes
        setTimeout(() => {
          clearInterval(checkSDK);
          if (typeof window.Pi === 'undefined') {
            console.warn('SDK Pi non chargé après 5 secondes');
          }
        }, 5000);
      }
    };

    checkPiEnvironment();
  }, []);

  return { isPiBrowser, isPiLoaded };
};