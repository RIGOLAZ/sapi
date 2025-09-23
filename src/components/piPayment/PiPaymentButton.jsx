import React, { useState, useEffect } from 'react';
import { Button, Modal, Spinner, Alert } from 'react-bootstrap';
import piPaymentService from '../../services/piPayment.service';
import './PiPaymentButton.css';

const PiPaymentButton = ({ 
  amount, 
  memo, 
  onPaymentSuccess, 
  onPaymentError,
  productId,
  productType = 'article' // adapter selon votre catalogue SAPI
}) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isPiReady, setIsPiReady] = useState(false);

  useEffect(() => {
    checkPiAvailability();
  }, []);

  const checkPiAvailability = async () => {
    try {
      await piPaymentService.initializePiSDK();
      setIsPiReady(true);
    } catch (error) {
      console.error('Pi SDK non disponible:', error);
      setIsPiReady(false);
    }
  };

  const handlePiPayment = async () => {
    if (!isPiReady) {
      alert('Veuillez ouvrir cette application dans le navigateur Pi pour effectuer un paiement.');
      return;
    }

    setLoading(true);
    setPaymentStatus('Initialisation du paiement...');

    try {
      // Authentifier l'utilisateur Pi
      setPaymentStatus('Authentification Pi...');
      const authResult = await piPaymentService.authenticateUser();
      
      // Créer le paiement
      setPaymentStatus('Création du paiement...');
      const metadata = {
        productId,
        productType,
        userId: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail')
      };

      await piPaymentService.createPayment(amount, memo, metadata);
      
      setPaymentStatus('Paiement en cours de traitement...');
      
    } catch (error) {
      console.error('Erreur paiement Pi:', error);
      setPaymentStatus('Erreur: ' + error.message);
      if (onPaymentError) onPaymentError(error);
    }
  };

  return (
    <>
      <Button 
        variant="primary" 
        onClick={handlePiPayment}
        disabled={loading}
        className="pi-payment-btn"
      >
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Traitement...
          </>
        ) : (
          `Payer ${amount} Pi`
        )}
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Paiement Pi Network</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            {paymentStatus}
          </Alert>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PiPaymentButton;