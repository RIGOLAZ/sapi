import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './PayWithPi.css';
import { selectCartTotalAmount } from '../../redux/slice/cartSlice';

const PayWithPi = ({ amount, orderId, onPaymentSuccess, onPaymentCancel }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [walletAddress] = useState('GAPAN6CCLJKL4RS3FCQOGWN763AK7EGMYGCNJMPXJHUSFMSZ52L3B36E');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const generatePaymentData = () => {
      const paymentInfo = {
        address: walletAddress,
        amount: amount,
        orderId: orderId,
        memo: `ETRALI-${orderId}`,
        timestamp: Date.now(),
        expires: Date.now() + 600000
      };
      
      setPaymentData(paymentInfo);
    };

    generatePaymentData();
  }, [amount, orderId, walletAddress]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    alert('Adresse copiée dans le presse-papiers!');
  };

  const handlePaymentComplete = () => {
    setPaymentStatus('completed');
    onPaymentSuccess({
      orderId,
      amount,
      address: walletAddress,
      timestamp: Date.now()
    });
  };

  if (paymentStatus === 'expired') {
    return (
      <div className="paywithpi-container expired">
        <div className="payment-expired">
          <h3>Paiement expiré</h3>
          <p>Le délai de paiement de 10 minutes est écoulé.</p>
          <button onClick={onPaymentCancel} className="btn-return">
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

  return (
    <div className="paywithpi-container">
      <div className="payment-header">
        <h2>Paiement avec Pi Network</h2>
        <div className="timer">
          Expire dans: <span className={timeLeft < 60 ? 'warning' : ''}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="payment-content">
        <div className="qr-section">
          <h3>Scannez le QR Code</h3>
          <div className="qr-container">
            {paymentData && (
              <QRCodeSVG // Correction ici
                value={`pi:${walletAddress}?amount=${amount}&memo=${paymentData.memo}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            )}
          </div>
          <p className="qr-instruction">
            Ouvrez votre application Pi Network et scannez ce code
          </p>
        </div>

        <div className="manual-section">
          <h3>Ou payez manuellement</h3>
          <div className="wallet-address">
            <label>Adresse du wallet:</label>
            <div className="address-container">
              <input
                type="text"
                value={walletAddress}
                readOnly
                className="address-input"
              />
              <button onClick={handleCopyAddress} className="copy-btn">
                Copier
              </button>
            </div>
          </div>

          <div className="payment-details">
            <div className="detail-item">
              <span className="label">Montant:</span>
              <span className="value">{selectCartTotalAmount} π</span>
            </div>
            <div className="detail-item">
              <span className="label">Memo:</span>
              <span className="value">ETRALIs{orderId}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-actions">
        <button 
          onClick={handlePaymentComplete} 
          className="btn-confirm"
          disabled={paymentStatus !== 'pending'}
        >
          J'ai effectué le paiement
        </button>
        <button onClick={onPaymentCancel} className="btn-cancel">
          Annuler
        </button>
      </div>

      <div className="payment-info">
        <h4>Comment payer avec Pi:</h4>
        <ol>
          <li>Ouvrez l'application Pi Network</li>
          <li>Allez dans la section "Transfer" ou "Send"</li>
          <li>Scannez le QR code ou entrez l'adresse manuellement</li>
          <li>Entrez le montant exact: <strong>{selectCartTotalAmount} π</strong></li>
          <li>Ajoutez le memo: <strong>ETRALIS-{orderId}</strong></li>
          <li>Confirmez la transaction</li>
        </ol>
      </div>
    </div>
  );
};

export default PayWithPi;