import { useState, useEffect, useCallback } from 'react';
import piNetworkService from '../services/piNetwork.service';

export const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle');

  useEffect(() => {
    setIsPiBrowser(piNetworkService.isPiBrowser());
  }, []);

  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
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
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setPaymentStatus('idle');
    setLoading(false);
  }, []);

  return {
    isPiBrowser,
    loading,
    error,
    paymentStatus,
    createPayment,
    reset
  };
};