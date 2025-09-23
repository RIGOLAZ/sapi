import React from 'react';
import { usePiPayment } from '../../hooks/usePiPayment';
import './PiPaymentButton.css';

const PiPaymentButton = ({ 
  amount, 
  memo, 
  onSuccess, 
  onError,
  className = '',
  disabled = false,
  children 
}) => {
  const { isPiBrowser, loading, error, paymentStatus, createPayment } = usePiPayment();

  const handleClick = async () => {
    try {
      const result = await createPayment(amount, memo, {
        source: 'sapi_cart',
        timestamp: Date.now()
      });
      
      if (onSuccess) onSuccess(result);
    } catch (error) {
      if (onError) onError(error);
    }
  };

  // Respecte ton design existant - ne change que la fonctionnalité
  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading || !isPiBrowser}
      className={`pi-payment-btn ${className}`}
    >
      {loading ? (
        <span className="pi-loading">
          <span className="pi-spinner"></span>
          Traitement...
        </span>
      ) : children ? (
        children
      ) : (
        `Payer ${amount} Pi`
      )}
    </button>
  );
};

export default PiPaymentButton;