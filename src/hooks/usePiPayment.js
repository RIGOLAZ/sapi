// hooks/usePiPayment.js - VERSION CORRIGÉE
import { useState, useCallback } from 'react';

export const usePiPayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  const initiatePayment = useCallback(async (paymentData) => {
    if (typeof window.Pi === 'undefined') {
      throw new Error('SDK Pi non disponible');
    }

    if (typeof window.Pi.createPayment !== 'function') {
      throw new Error('Fonction createPayment non disponible');
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('🚀 Création paiement avec données:', paymentData);

      // Configuration robuste du paiement
      const paymentConfig = {
        amount: paymentData.amount,
        memo: paymentData.memo,
        metadata: paymentData.metadata,
        // Callbacks améliorés
        onReadyForServerApproval: (paymentId) => {
          console.log('✅ Prêt pour approbation serveur:', paymentId);
          setCurrentPayment({ ...paymentData, id: paymentId, status: 'approval_pending' });
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          console.log('✅ Prêt pour complétion serveur:', paymentId, txid);
          setCurrentPayment(prev => ({ ...prev, txid, status: 'completion_pending' }));
        },
        onCancel: (paymentId) => {
          console.log('❌ Paiement annulé:', paymentId);
          setCurrentPayment(prev => ({ ...prev, status: 'cancelled' }));
          setPaymentError('Paiement annulé par l\'utilisateur');
        },
        onError: (error, payment) => {
          console.error('❌ Erreur paiement:', error, payment);
          setCurrentPayment(prev => ({ ...prev, status: 'error' }));
          setPaymentError(error.message || 'Erreur lors du paiement');
        }
      };

      // Créer le paiement
      const payment = await window.Pi.createPayment(paymentConfig);
      console.log('🎉 Paiement créé avec succès:', payment);

      setCurrentPayment({ ...payment, status: 'completed' });
      return payment;

    } catch (error) {
      console.error('💥 Erreur création paiement:', error);
      setPaymentError(error.message || 'Erreur inconnue lors du paiement');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Détection de l'environnement
  const getPiEnvironment = () => {
    const hostname = window.location.hostname;
    if (hostname === 'sapi.etralis.com') return 'production';
    if (hostname.includes('minepi.com')) return 'pi_browser';
    return 'sandbox';
  };

  return {
    initiatePayment,
    isProcessing,
    paymentError,
    currentPayment,
    piEnvironment: getPiEnvironment()
  };
};