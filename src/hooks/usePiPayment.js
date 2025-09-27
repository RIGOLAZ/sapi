import { useState, useEffect, useCallback } from 'react';
import piNetworkService from '../services/piNetwork.service';

export const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsPiBrowser(piNetworkService.isPiBrowser());
  }, []);

  // Nouvelle méthode pour déclencher l'authentification
  const authenticate = useCallback(async () => {
    if (!isPiBrowser) {
      throw new Error('Pi Browser non détecté');
    }

    setLoading(true);
    setError(null);
    setPaymentStatus('authenticating');

    try {
      const authResult = await piNetworkService.authenticate();
      setIsAuthenticated(true);
      setPaymentStatus('authenticated');
      console.log('Authentification réussie:', authResult);
      return authResult;
    } catch (error) {
      setError(error.message);
      setPaymentStatus('auth_failed');
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isPiBrowser]);

  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    // Authentifier d'abord si pas encore fait
    if (!isAuthenticated) {
      await authenticate();
    }

    setLoading(true);
    setError(null);
    setPaymentStatus('initializing');

    try {
      const result = await piNetworkService.createPayment(amount, memo, metadata);
      setPaymentStatus('completed');
      return result;
    } catch (error) {
      setError(error.message);
      setPaymentStatus('failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authenticate]);

  const reset = useCallback(() => {
    setError(null);
    setPaymentStatus('idle');
    setLoading(false);
    setIsAuthenticated(false);
  }, []);

  return {
    isPiBrowser,
    loading,
    error,
    paymentStatus,
    isAuthenticated,
    authenticate,
    createPayment,
    reset
  };
};