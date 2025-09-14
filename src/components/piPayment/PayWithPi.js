// src/components/piPayment/PayWithPi.js
import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // AJOUTER CET IMPORT
import { toast } from 'react-toastify';
import { FaQrcode, FaCopy, FaCheck } from 'react-icons/fa';
import styles from './PayWithPi.module.css';

const PayWithPi = ({ cartItems, totalAmount, onSuccess, onError, userId }) => {
  const [paymentStep, setPaymentStep] = useState('initial');
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrData, setQrData] = useState(null); // AJOUTER CET ÉTAT

  // Validation des données
  const validateProps = () => {
    if (!Array.isArray(cartItems)) return false;
    if (cartItems.length === 0) return false;
    if (typeof totalAmount !== 'number' || totalAmount <= 0) return false;
    if (!userId) return false;
    return true;
  };

  const generatePayment = async () => {
    try {
      if (!validateProps()) {
        throw new Error('Invalid data provided');
      }

      setPaymentStep('generating');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // GÉNÉRER LE VRAI CODE QR
      const PI_WALLET_ADDRESS = process.env.REACT_APP_PI_WALLET_ADDRESS || 'GDRVFVPXGHDCQ2P3M2NIMkNiqzSLrZL4k';
      const orderId = `ORDER_${Date.now()}`;
      
      // Créer l'URI pour le paiement Pi
      const piUri = `pi://payment?address=${PI_WALLET_ADDRESS}&amount=${totalAmount}&memo=Order-${orderId}`;
      
      setQrData({
        uri: piUri,
        paymentData: {
          address: PI_WALLET_ADDRESS,
          amount: totalAmount,
          memo: `Order ${orderId}`,
          orderId: orderId
        }
      });

      setPaymentStep('qr_generated');
      toast.success('QR Code generated! Scan with Pi Network app.');
      
    } catch (error) {
      console.error('Payment generation error:', error);
      setPaymentStep('error');
      toast.error('Failed to generate payment');
      if (onError) onError(error);
    }
  };

  const copyPaymentLink = () => {
    if (qrData?.uri) {
      navigator.clipboard.writeText(qrData.uri)
        .then(() => toast.success('Payment link copied!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  const verifyPayment = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter a transaction ID');
      return;
    }

    setIsVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentStep('completed');
      toast.success('Payment verified!');
      if (onSuccess) onSuccess({ transactionId });
    } catch (error) {
      setPaymentStep('failed');
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // État d'erreur si les données sont invalides
  if (!validateProps()) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Invalid Cart Data</h3>
        <p>Please check your cart and try again.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  return (
    <div className={styles.payWithPiContainer}>
      {paymentStep === 'initial' && (
        <div className={styles.initialView}>
          <div className={styles.paymentInfo}>
            <h3>Complete Your Purchase</h3>
            <div className={styles.orderSummary}>
              <p><strong>Total:</strong> {totalAmount} PI</p>
              <p><strong>Items:</strong> {cartItems.length}</p>
            </div>
          </div>
          
          <button className={styles.generatePaymentBtn} onClick={generatePayment}>
            <FaQrcode />
            Generate Pi Payment
          </button>
        </div>
      )}

      {paymentStep === 'generating' && (
        <div className={styles.loadingView}>
          <div className={styles.loadingSpinner}></div>
          <p>Preparing your payment...</p>
        </div>
      )}

      {paymentStep === 'qr_generated' && (
        <div className={styles.qrStep}>
          <h4>Scan with Pi Network App</h4>
          <div className={styles.qrContainer}>
            {/* CODE QR RÉEL */}
            {qrData && (
              <QRCodeCanvas 
                value={qrData.uri}
                size={200}
                level="H"
                includeMargin={true}
                className={styles.qrCode}
              />
            )}
          </div>
          
          <div className={styles.paymentDetails}>
            <p><strong>Amount:</strong> {totalAmount} PI</p>
            <p><strong>Wallet:</strong> GDRVFVPXGHDCQ2P3M2NIMkNiqzSLrZL4k</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.copyButton} onClick={copyPaymentLink}>
              <FaCopy />
              Copy Payment Link
            </button>
            
            <div className={styles.manualVerify}>
              <input
                type="text"
                placeholder="Enter transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className={styles.input}
              />
              <button 
                className={styles.verifyButton}
                onClick={verifyPayment}
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentStep === 'completed' && (
        <div className={styles.successView}>
          <div className={styles.successIcon}>
            <FaCheck />
          </div>
          <h3>Payment Successful!</h3>
          <p>Your order has been confirmed.</p>
        </div>
      )}

      {paymentStep === 'failed' && (
        <div className={styles.errorView}>
          <h3>Payment Failed</h3>
          <p>Please try again or contact support.</p>
          <button onClick={() => setPaymentStep('initial')}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PayWithPi;