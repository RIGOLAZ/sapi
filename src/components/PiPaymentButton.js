import React from 'react';
import { usePi } from '../../context/PiContext.js'; // ← Import nommé

const PiPaymentButton = ({ amount, memo, metadata, onSuccess, onError, children }) => {
    const { 
        isAuthenticated, 
        isProcessing, 
        paymentError, 
        makePayment,
        login 
    } = usePi(); // ← usePi est un export nommé

    const handlePayment = async () => {
        if (!isAuthenticated) {
            await login();
            return;
        }

        try {
            const paymentData = {
                amount,
                memo,
                metadata
            };

            await makePayment(paymentData);
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Erreur paiement:", error);
            if (onError) {
                onError(error);
            }
        }
    };

    if (paymentError) {
        return (
            <div className="pi-payment-error">
                <button onClick={handlePayment} className="pi-payment-button error">
                    Réessayer le paiement
                </button>
                <span className="error-message">{paymentError}</span>
            </div>
        );
    }

    return (
        <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className={`pi-payment-button ${isProcessing ? 'processing' : ''}`}
        >
            {isProcessing ? (
                'Traitement du paiement...'
            ) : (
                children || `Payer ${amount} π`
            )}
        </button>
    );
};

export default PiPaymentButton; // ← Export par défaut