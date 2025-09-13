import React, { useState, useEffect, useCallback } from 'react';

import { QRCodeSVG } from 'qrcode.react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import './PayWithPi.module.css';

const PayWithPi = ({ amount, orderId, onPaymentSuccess, onPaymentCancel, userId }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('initializing');
  const [timeLeft, setTimeLeft] = useState(600);
  const [piSdk, setPiSdk] = useState(null);
  const [auth, setAuth] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Références Firebase
  const paymentRef = paymentId ? doc(db, 'pi_payments', paymentId) : null;
  const orderRef = doc(db, 'orders', orderId);

  // Cloud Functions
  const createPiPayment = httpsCallable(functions, 'createPiPayment');
  const approvePiPayment = httpsCallable(functions, 'approvePiPayment');
  const completePiPayment = httpsCallable(functions, 'completePiPayment');
  const cancelPiPayment = httpsCallable(functions, 'cancelPiPayment');

  // Initialisation SDK Pi
  useEffect(() => {
    const initializePiSDK = async () => {
      try {
        if (window.Pi) {
          setPiSdk(window.Pi);
          setPaymentStatus('ready');
        } else {
          console.warn('Pi SDK non disponible - mode développement');
          setPaymentStatus('development');
        }
      } catch (err) {
        console.error('Erreur initialisation Pi SDK:', err);
        setError('Impossible de charger le SDK Pi Network');
        setPaymentStatus('error');
      }
    };

    initializePiSDK();
  }, []);

  // Écouter les changements de statut du paiement
  useEffect(() => {
    if (!paymentRef) return;

    const unsubscribe = onSnapshot(paymentRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentStatus(data.status);
        
        if (data.status === 'completed' && data.txid) {
          onPaymentSuccess({
            orderId,
            amount,
            txid: data.txid,
            paymentId,
            timestamp: data.completedAt?.toDate() || new Date()
          });
        }
      }
    });

    return () => unsubscribe();
  }, [paymentRef, paymentId, orderId, amount, onPaymentSuccess]);

  // Timer
  useEffect(() => {
    if (!['waiting_approval', 'approved', 'pending'].includes(paymentStatus)) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handlePaymentExpired();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus]);

  // Vérifier les paiements incomplets
  const checkIncompletePayments = useCallback(async () => {
    if (!userId) return;

    try {
      const q = query(
        collection(db, 'pi_payments'),
        where('userId', '==', userId),
        where('status', 'in', ['incomplete', 'pending']),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const incompletePayments = await getDocs(q);
      
      if (!incompletePayments.empty) {
        const latestPayment = incompletePayments.docs[0].data();
        if (latestPayment.status === 'pending') {
          setPaymentId(incompletePayments.docs[0].id);
          setPaymentStatus('pending');
        }
      }
    } catch (err) {
      console.error('Erreur vérification paiements incomplets:', err);
    }
  }, [userId]);

  useEffect(() => {
    checkIncompletePayments();
  }, [checkIncompletePayments]);

  // Gestion des paiements incomplets
  const onIncompletePaymentFound = useCallback((payment) => {
    console.log('Paiement incomplet trouvé:', payment);
    if (payment?.transaction?.txid) {
      onReadyForServerCompletion(payment.identifier, payment.transaction.txid);
    }
  }, []);

  // Authentification
  const authenticateUser = useCallback(async () => {
    if (!piSdk) return;

    try {
      setLoading(true);
      const authResult = await piSdk.authenticate(['payments'], onIncompletePaymentFound);
      setAuth(authResult);
      return authResult;
    } catch (err) {
      console.error('Erreur authentification:', err);
      setError('Authentification échouée');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [piSdk, onIncompletePaymentFound]);

  // Créer le paiement
  const createPayment = useCallback(async () => {
    if (!piSdk || !auth) {
      await authenticateUser();
    }

    try {
      setLoading(true);
      setError(null);

      const result = await createPiPayment({
        amount: amount,
        orderId: orderId,
        userId: userId,
        memo: `Achat EtraliShop - Commande #${orderId}`,
        metadata: {
          productType: 'ecommerce',
          items: await getOrderItems(),
          userEmail: auth?.user?.uid
        }
      });

      const { paymentId: newPaymentId, paymentData: newPaymentData } = result.data;
      
      setPaymentId(newPaymentId);
      setPaymentData(newPaymentData);
      setPaymentStatus('created');

      if (piSdk && newPaymentData.identifier) {
        await piSdk.createPayment(newPaymentData, {
          onReadyForServerApproval: onReadyForServerApproval,
          onReadyForServerCompletion: onReadyForServerCompletion,
          onCancel: handlePaymentCancel,
          onError: onPaymentError
        });
      }

    } catch (err) {
      console.error('Erreur création paiement:', err);
      setError(err.message || 'Erreur lors de la création du paiement');
      setPaymentStatus('error');
    } finally {
      setLoading(false);
    }
  }, [piSdk, auth, amount, orderId, userId, createPiPayment, onReadyForServerApproval, onReadyForServerCompletion, handlePaymentCancel]);

  // Approval serveur via Firebase
  const onReadyForServerApproval = useCallback(async (paymentIdentifier) => {
    console.log('Approval serveur requise:', paymentIdentifier);
    setPaymentStatus('approving');
    
    try {
      const result = await approvePiPayment({
        paymentId: paymentId,
        paymentIdentifier: paymentIdentifier,
        orderId: orderId,
        amount: amount
      });

      if (result.data.success) {
        setPaymentStatus('approved');
      } else {
        throw new Error(result.data.error || 'Approval échouée');
      }
    } catch (err) {
      console.error('Erreur approval serveur:', err);
      setError(err.message || 'Erreur lors de l\'approval du paiement');
      setPaymentStatus('error');
    }
  }, [paymentId, orderId, amount, approvePiPayment]);

  // Completion serveur via Firebase
  const onReadyForServerCompletion = useCallback(async (paymentIdentifier, txid) => {
    console.log('Completion serveur requise:', paymentIdentifier, txid);
    setPaymentStatus('completing');
    
    try {
      const result = await completePiPayment({
        paymentId: paymentId,
        paymentIdentifier: paymentIdentifier,
        txid: txid,
        orderId: orderId
      });

      if (result.data.success) {
        setPaymentStatus('completed');
      } else {
        throw new Error(result.data.error || 'Completion échouée');
      }
    } catch (err) {
      console.error('Erreur completion serveur:', err);
      setError(err.message || 'Erreur lors de la completion du paiement');
      setPaymentStatus('error');
    }
  }, [paymentId, orderId, completePiPayment]);

  // Gestion des erreurs
  const onPaymentError = useCallback((error, payment) => {
    console.error('Erreur paiement:', error, payment);
    setError(`Erreur de paiement: ${error.message}`);
    setPaymentStatus('error');
    
    logError('payment_error', {
      error: error.message,
      payment: payment,
      userId: userId,
      timestamp: serverTimestamp()
    });
  }, [userId]);

  // Gestion annulation paiement
  const handlePaymentCancel = useCallback(async () => {
    if (paymentId) {
      try {
        await cancelPiPayment({
          paymentId: paymentId,
          reason: 'user_cancelled'
        });
      } catch (err) {
        console.error('Erreur annulation paiement:', err);
      }
    }
    if (onPaymentCancel) {
      onPaymentCancel();
    }
  }, [paymentId, cancelPiPayment, onPaymentCancel]);

  // Paiement expiré
  const handlePaymentExpired = useCallback(async () => {
    if (paymentId) {
      try {
        await cancelPiPayment({
          paymentId: paymentId,
          reason: 'expired'
        });
      } catch (err) {
        console.error('Erreur annulation paiement expiré:', err);
      }
    }
    setPaymentStatus('expired');
  }, [paymentId, cancelPiPayment]);

  // Helper pour obtenir les articles de la commande
  const getOrderItems = async () => {
    try {
      const orderDoc = await getDoc(orderRef);
      if (orderDoc.exists()) {
        return orderDoc.data().items || [];
      }
      return [];
    } catch (err) {
      console.error('Erreur récupération commande:', err);
      return [];
    }
  };

  // Logger les erreurs
  const logError = async (type, data) => {
    try {
      await setDoc(doc(db, 'errors', `${Date.now()}_${userId || 'anonymous'}`), {
        type: type,
        data: data,
        userId: userId,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Erreur logging:', err);
    }
  };

  // Formatage du temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendu selon l'état
  if (paymentStatus === 'error') {
    return (
      <div className="paywithpi-container error">
        <div className="payment-error">
          <div className="error-icon">⚠️</div>
          <h3>Erreur de paiement</h3>
          <p>{error || 'Une erreur est survenue.'}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="btn-retry">
              Réessayer
            </button>
            <button onClick={handlePaymentCancel} className="btn-cancel">
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'expired') {
    return (
      <div className="paywithpi-container expired">
        <div className="payment-expired">
          <h3>Paiement expiré</h3>
          <p>Le délai de paiement est écoulé.</p>
          <button onClick={handlePaymentCancel} className="btn-return">
            Retour au panier
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="paywithpi-container success">
        <div className="payment-success">
          <div className="success-icon">✓</div>
          <h3>Paiement réussi!</h3>
          <p>Votre commande a été confirmée.</p>
          <div className="payment-details">
            <p>Montant: {amount} π</p>
            <p>Commande: #{orderId}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || ['approving', 'completing'].includes(paymentStatus)) {
    return (
      <div className="paywithpi-container loading">
        <div className="payment-loading">
          <div className="spinner"></div>
          <h3>Traitement...</h3>
          <p>{paymentStatus === 'approving' ? 'Approbation en cours...' : 'Finalisation du paiement...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="paywithpi-container">
      <div className="payment-header">
        <h2>Paiement avec Pi Network</h2>
        {['waiting_approval', 'approved', 'pending'].includes(paymentStatus) && (
          <div className="timer">
            Expire dans: <span className={timeLeft < 60 ? 'warning' : ''}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      <div className="payment-content">
        {paymentStatus === 'initializing' || paymentStatus === 'ready' || paymentStatus === 'development' ? (
          <div className="payment-init">
            <div className="pi-logo">
              <img src="/pi-logo.png" alt="Pi Network" />
            </div>
            <h3>Prêt pour le paiement</h3>
            <p>Montant: <strong>{amount} π</strong></p>
            <p>Commande: #{orderId}</p>
            {paymentStatus === 'development' && (
              <div className="dev-notice">
                <p>⚠️ Mode développement - SDK Pi non disponible</p>
              </div>
            )}
            <button 
              onClick={createPayment} 
              className="btn-start-payment"
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Commencer le paiement'}
            </button>
          </div>
        ) : (
          <>
            <div className="status-info">
              <div className={`status-badge ${paymentStatus}`}>
                {paymentStatus === 'created' && 'Paiement créé'}
                {paymentStatus === 'waiting_approval' && 'En attente d\'approval'}
                {paymentStatus === 'approved' && 'Approuvé - Finalisez dans l\'app Pi'}
                {paymentStatus === 'pending' && 'En attente de confirmation'}
              </div>
            </div>

            {paymentStatus === 'approved' && (
              <div className="qr-section">
                <h3>Ouvrez l'application Pi Network</h3>
                <div className="app-instructions">
                  <ol>
                    <li>Ouvrez l'app Pi sur votre téléphone</li>
                    <li>Allez dans l'onglet "Transfer"</li>
                    <li>Confirmez le paiement de <strong>{amount} π</strong></li>
                    <li>Vérifiez le memo: <strong>ETRALI-{orderId}</strong></li>
                  </ol>
                </div>
              </div>
            )}

            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Montant:</span>
                <span className="value">{amount} π</span>
              </div>
              <div className="detail-item">
                <span className="label">Commande:</span>
                <span className="value">#{orderId}</span>
              </div>
              {paymentId && (
                <div className="detail-item">
                  <span className="label">ID Paiement:</span>
                  <span className="value">{paymentId.substring(0, 8)}...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="payment-actions">
        <button onClick={handlePaymentCancel} className="btn-cancel">
          Annuler
        </button>
      </div>

      <div className="security-notice">
        <p>🔒 Ce paiement est sécurisé par Pi Network & Firebase</p>
      </div>
    </div>
  );
};

export default PayWithPi;