// hooks/usePiAuth.js - VERSION CORRIGÉE
import { useState, useEffect, useCallback } from 'react';

export const usePiAuth = () => {
  const [piUser, setPiUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Vérification robuste de l'état d'authentification
  const checkRealAuthState = useCallback(async () => {
    if (typeof window.Pi === 'undefined') {
      console.log('SDK Pi non disponible pour vérification auth');
      return false;
    }

    try {
      // Méthode plus fiable pour vérifier l'authentification
      const user = window.Pi.user;
      const authenticated = !!(user && user.uid);
      
      console.log('🔐 État auth réel:', { user, authenticated });
      
      if (authenticated) {
        setPiUser(user);
        setIsAuthenticated(true);
        return true;
      } else {
        setPiUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      return false;
    }
  }, []);

  // Authentification avec gestion d'erreur améliorée
  const authenticatePi = useCallback(async () => {
    if (typeof window.Pi === 'undefined') {
      throw new Error('SDK Pi non disponible');
    }

    setAuthLoading(true);
    
    try {
      console.log('🔄 Début authentification Pi...');
      
      // Scopes nécessaires pour le paiement
      const scopes = ['payments', 'username'];
      
      const user = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      console.log('✅ Authentification réussie:', user);
      
      setPiUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('❌ Erreur authentification:', error);
      setPiUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Gestion des paiements incomplets (important pour Pi Browser)
  const onIncompletePaymentFound = (payment) => {
    console.log('💰 Paiement incomplet trouvé:', payment);
    // Vous pouvez gérer la reprise de paiement ici
  };

  // Synchronisation au chargement
  useEffect(() => {
    const initializeAuth = async () => {
      await checkRealAuthState();
    };

    // Attendre que le SDK soit chargé
    if (typeof window.Pi !== 'undefined') {
      initializeAuth();
    } else {
      // Vérifier périodiquement
      const interval = setInterval(() => {
        if (typeof window.Pi !== 'undefined') {
          initializeAuth();
          clearInterval(interval);
        }
      }, 500);
      
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, [checkRealAuthState]);

  return {
    piUser,
    isAuthenticated,
    authenticatePi,
    authLoading,
    checkRealAuthState
  };
};