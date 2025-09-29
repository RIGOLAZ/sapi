import { useState, useEffect, useCallback, useRef } from 'react';
import PiNetworkService from '../services/piNetwork.service';

export const usePiPayment = () => {
  const piService = useRef(new PiNetworkService()).current;

  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsPiBrowser(piService.isPiBrowser());
  }, [piService]);

  const authenticate = useCallback(async () => {
  if (!isPiBrowser) throw new Error('Pi Browser non détecté');
  setLoading(true);
  setError(null);
  setPaymentStatus('authenticating');
  try {
    await piService.init(); // force sandbox
    const res = await piService.authenticate();
    setIsAuthenticated(true);
    setPaymentStatus('authenticated');
    console.log('Auth OK :', res);
    return res;
  } catch (e) {
    setError(e.message);
    setPaymentStatus('auth_failed');
    setIsAuthenticated(false);
    throw e;
  } finally {
    setLoading(false);
  }
}, [isPiBrowser, piService]);

  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    if (!isAuthenticated) await authenticate();
    setLoading(true);
    setError(null);
    setPaymentStatus('initializing');
    try {
      const res = await piService.createPayment(amount, memo, metadata);
      setPaymentStatus('completed');
      return res;
    } catch (e) {
      setError(e.message);
      setPaymentStatus('failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authenticate, piService]);

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