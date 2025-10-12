import { useState, useCallback } from 'react';
import { db } from '../firebase/config.js';
import { doc, setDoc } from 'firebase/firestore';

export const usePiPayment = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [currentPayment, setCurrentPayment] = useState(null);

    // Mettre à jour le statut de la commande
    const updateOrderStatus = useCallback(async (orderId, status, additionalData = {}) => {
        try {
            if (orderId) {
                await setDoc(doc(db, 'orders', orderId), {
                    status,
                    ...additionalData,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (error) {
            console.error("Erreur mise à jour commande:", error);
        }
    }, []);
    
// Gestion de l'approbation serveur - VERSION HTTP
const handleServerApproval = useCallback(async (paymentId, paymentData) => {
    try {
        console.log('🔄 Appel fonction approvePayment (HTTP) avec:', { paymentId });
        
        const response = await fetch('https://us-central1-ecomm-f0ae6.cloudfunctions.net/approvePayment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentId: paymentId,
                paymentData: paymentData
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur approbation');
        }
        
        console.log("✅ Approbation reçue:", result);
        
    } catch (error) {
        console.error("❌ Erreur approbation:", error);
        setPaymentError(error.message);
        
        await updateOrderStatus(paymentData.metadata?.orderId, 'approval_failed', {
            error: error.message
        });
    }
}, [updateOrderStatus]);

// Gestion de la finalisation serveur - VERSION HTTP
const handleServerCompletion = useCallback(async (paymentId, txid, paymentData) => {
    try {
        console.log('🔄 Appel fonction completePayment (HTTP) avec:', { paymentId, txid });
        
        const response = await fetch('https://us-central1-ecomm-f0ae6.cloudfunctions.net/completePayment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentId: paymentId,
                txid: txid,
                paymentData: paymentData
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur complétion');
        }
        
        console.log("✅ Finalisation reçue:", result);
        
        await updateOrderStatus(paymentData.metadata?.orderId, 'completed', {
            piPaymentId: paymentId,
            piTransactionId: txid,
            completedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Erreur finalisation:", error);
        setPaymentError(error.message);
    }
}, [updateOrderStatus]);

    // Gestion annulation
    const handlePaymentCancel = useCallback((paymentId, paymentData) => {
        console.log("❌ Paiement annulé:", paymentId);
        updateOrderStatus(paymentData.metadata?.orderId, 'cancelled', {
            cancelledAt: new Date().toISOString()
        });
    }, [updateOrderStatus]);

    // Gestion erreur
    const handlePaymentError = useCallback((error, paymentData) => {
        console.error("❌ Erreur paiement:", error);
        setPaymentError(error.message);
        updateOrderStatus(paymentData.metadata?.orderId, 'failed', { 
            error: error.message,
            failedAt: new Date().toISOString()
        });
    }, [updateOrderStatus]);

    // Fonction pour initier un paiement
    const initiatePayment = useCallback(async (paymentData) => {
        if (!window.Pi) {
            throw new Error("SDK Pi non disponible");
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            console.log('🚀 Création du paiement Pi avec:', paymentData);
            
            const payment = await window.Pi.createPayment({
                amount: paymentData.amount,
                memo: paymentData.memo || `Achat sur ${window.location.hostname}`,
                metadata: {
                    ...paymentData.metadata,
                    timestamp: new Date().toISOString(),
                    platform: 'web'
                }
            }, {
                onReadyForServerApproval: (paymentId) => {
                    console.log("✅ Paiement prêt pour approbation:", paymentId);
                    handleServerApproval(paymentId, paymentData);
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    console.log("✅ Paiement prêt pour finalisation:", paymentId, txid);
                    handleServerCompletion(paymentId, txid, paymentData);
                },
                onCancel: (paymentId) => {
                    console.log("❌ Paiement annulé:", paymentId);
                    handlePaymentCancel(paymentId, paymentData);
                },
                onError: (error, payment) => {
                    console.error("❌ Erreur lors du paiement:", error, payment);
                    handlePaymentError(error, paymentData);
                }
            });

            setCurrentPayment(payment);
            console.log("✅ Paiement Pi créé:", payment);
            return payment;

        } catch (error) {
            console.error("❌ Erreur lors de la création du paiement Pi:", error);
            setPaymentError(error.message);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, [handleServerApproval, handleServerCompletion, handlePaymentCancel, handlePaymentError]);

    return {
        initiatePayment,
        isProcessing,
        paymentError,
        currentPayment,
        clearError: () => setPaymentError(null)
    };
};