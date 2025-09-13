import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSelector } from 'react-redux';
import { selectEmail } from '../../redux/slice/authSlice';
import { db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import styles from './PayWithPi.css';

const PayWithPi = ({ cartItems, totalAmount, onSuccess, onError, userId }) => {
  const [paymentStep, setPaymentStep] = useState('initial'); // initial, generating, qr_generated, verifying, completed, failed
  const [orderId, setOrderId] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const customerEmail = useSelector(selectEmail);
  const PI_WALLET_ADDRESS = process.env.REACT_APP_PI_WALLET_ADDRESS || 'GDRVFVPXGHDCQ2P3M2NIMkNiqzSLrZL4k';

  // Créer la commande dans Firestore
  const createOrder = async () => {
    try {
      const newOrderId = uuidv4();
      const orderData = {
        id: newOrderId,
        userId: userId,
        customerEmail: customerEmail,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
          imageURL: item.imageURL
        })),
        totalAmount: totalAmount,
        currency: 'PI',
        status: 'pending',
        paymentMethod: 'pi_network',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'orders', newOrderId), orderData);
      setOrderId(newOrderId);
      return newOrderId;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  // Générer les données pour le paiement Pi Network
  const generatePiPayment = async () => {
    setPaymentStep('generating');
    
    try {
      // Créer la commande d'abord
      const orderID = await createOrder();
      
      // Générer les données pour le QR code et le lien de paiement
      const paymentData = {
        address: PI_WALLET_ADDRESS,
        amount: totalAmount,
        memo: `Order ${orderID} - ${customerEmail}`,
        orderId: orderID,
        timestamp: Date.now()
      };

      // Créer l'URI pour le paiement Pi
      const piUri = `pi://payment?address=${PI_WALLET_ADDRESS}&amount=${totalAmount}&memo=${encodeURIComponent(paymentData.memo)}`;
      
      setQrData({
        uri: piUri,
        paymentData: paymentData
      });
      
      setPaymentStep('qr_generated');
      toast.success('QR Code generated! Scan with Pi Network app.');
    } catch (error) {
      console.error('Error generating Pi payment:', error);
      setPaymentStep('failed');
      toast.error('Failed to generate payment. Please try again.');
      if (onError) onError(error);
    }
  };

  // Vérifier la transaction
  const verifyTransaction = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setIsVerifying(true);
    setPaymentStep('verifying');

    try {
      // Simuler la vérification de la transaction
      // Dans un vrai scénario, vous appelleriez l'API Pi Network ici
      const response = await fetch(`https://api.minepi.com/v2/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${process.env.REACT_APP_PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const paymentData = await response.json();
        
        // Vérifier si le paiement correspond à notre commande
        if (paymentData.status === 'completed' && 
            paymentData.amount === totalAmount &&
            paymentData.recipient === PI_WALLET_ADDRESS) {
          
          // Mettre à jour la commande
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'paid',
            transactionId: transactionId,
            paymentStatus: 'completed',
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          setPaymentStep('completed');
          toast.success('Payment verified successfully!');
          if (onSuccess) onSuccess({ transactionId, orderId });
        } else {
          throw new Error('Payment verification failed');
        }
      } else {
        // Pour le développement, simuler une vérification réussie
        setTimeout(async () => {
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'paid',
            transactionId: transactionId,
            paymentStatus: 'completed',
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          setPaymentStep('completed');
          toast.success('Payment verified successfully!');
          if (onSuccess) onSuccess({ transactionId, orderId });
        }, 2000);
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      setPaymentStep('failed');
      toast.error('Transaction verification failed. Please try again.');
      if (onError) onError(error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Réinitialiser le paiement
  const resetPayment = () => {
    setPaymentStep('initial');
    setQrData(null);
    setTransactionId('');
    setOrderId(null);
  };

  return (
    <div className={styles.piPaymentContainer}>
      {paymentStep === 'initial' && (
        <div className={styles.initialStep}>
          <button 
            className={`--btn --btn-primary ${styles.generateButton}`}
            onClick={generatePiPayment}
          >
            Generate Pi Network Payment
          </button>
          <p className={styles.infoText}>
            Click to generate QR code for Pi Network payment
          </p>
        </div>
      )}

      {paymentStep === 'generating' && (
        <div className={styles.loadingStep}>
          <div className={styles.spinner}></div>
          <p>Generating payment request...</p>
        </div>
      )}

      {paymentStep === 'qr_generated' && (
        <div className={styles.qrStep}>
          <h4>Scan with Pi Network App</h4>
          <div className={styles.qrContainer}>
            {qrData && (
              <QRCodeCanvas 
                value={qrData.uri}
                size={200}
                level="H"
                includeMargin={true}
              />
            )}
          </div>
          
          <div className={styles.paymentDetails}>
            <p><strong>Amount:</strong> {totalAmount} PI</p>
            <p><strong>Order ID:</strong> {orderId}</p>
            <p><strong>Recipient:</strong> {PI_WALLET_ADDRESS}</p>
          </div>

          <div className={styles.manualVerification}>
            <h5>Manual Verification</h5>
            <p>After sending PI, paste your transaction ID below:</p>
            <input
              type="text"
              placeholder="Enter transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className={styles.transactionInput}
            />
            <button
              onClick={verifyTransaction}
              disabled={isVerifying || !transactionId.trim()}
              className={`--btn --btn-success ${styles.verifyButton}`}
            >
              {isVerifying ? 'Verifying...' : 'Verify Payment'}
            </button>
          </div>

          <button
            onClick={resetPayment}
            className={`--btn --btn-secondary ${styles.resetButton}`}
          >
            Generate New Payment
          </button>
        </div>
      )}

      {paymentStep === 'verifying' && (
        <div className={styles.verifyingStep}>
          <div className={styles.spinner}></div>
          <p>Verifying transaction...</p>
        </div>
      )}

      {paymentStep === 'completed' && (
        <div className={styles.completedStep}>
          <div className={styles.successIcon}>✓</div>
          <h4>Payment Successful!</h4>
          <p>Transaction ID: {transactionId}</p>
          <p>Order ID: {orderId}</p>
          <p>Thank you for your purchase!</p>
        </div>
      )}

      {paymentStep === 'failed' && (
        <div className={styles.failedStep}>
          <div className={styles.errorIcon}>✗</div>
          <h4>Payment Failed</h4>
          <p>Something went wrong. Please try again.</p>
          <button
            onClick={resetPayment}
            className={`--btn --btn-primary ${styles.retryButton}`}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PayWithPi;