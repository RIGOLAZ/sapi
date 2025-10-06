import { useState, useEffect } from 'react';

export const usePiDetection = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isPiLoaded, setIsPiLoaded] = useState(false);

  useEffect(() => {
    const checkPiSDK = () => {
      const piAvailable = typeof window.Pi !== 'undefined';
      setIsPiLoaded(piAvailable);
      setIsPiBrowser(piAvailable);
      
      if (piAvailable) {
        console.log('✅ Pi SDK chargé:', window.Pi);
      } else {
        console.log('❌ Pi SDK non disponible');
        
        // Réessayer après 1 seconde
        setTimeout(checkPiSDK, 1000);
      }
    };

    checkPiSDK();
  }, []);

  return { isPiBrowser, isPiLoaded };
};