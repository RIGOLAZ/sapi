import React, { useState, useEffect } from 'react';
import { Button, Modal, Spinner, Alert, Card } from 'react-bootstrap';
import { useSelector } from 'react-redux'; // Si tu utilises Redux
import piPaymentService from '../../services/piPayment.service';
import './PiPaymentIntegration.css';

const PiPaymentIntegration = ({ 
  cartItems, 
  totalAmount, 
  onPaymentSuccess, 
  onPaymentError,
  shippingAddress,
  userData 
}) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isPiReady, setIsPiReady] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  // Récupérer les données utilisateur depuis Redux (adapte selon ton store)
  const currentUser = useSelector(state => state.user.currentUser);

  useEffect(() => {
    checkPiAvailability();
    generateOrderId();
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

  const generateOrderId = () => {
    // Générer un ID de commande unique pour SAPI
    const orderId = `sapi_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentOrderId(orderId);
  };

  const handlePiPayment = async () => {
    if (!isPiReady) {
      alert('Veuillez ouvrir cette application dans le navigateur Pi pour effectuer un paiement.');
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      alert('Votre panier est vide');
      return;
    }

    setLoading(true);
    setShowModal(true);
    setPaymentStatus('Préparation du paiement...');

    try {
      // Calculer le montant en Pi (adapter selon ton taux de conversion)
      const amountInPi = (totalAmount / 100).toFixed(2); // Conversion depuis cents
      
      // Préparer les métadonnées pour SAPI
      const metadata = {
        orderId: currentOrderId,
        userId: currentUser?.id || localStorage.getItem('userId'),
        userEmail: currentUser?.email || localStorage.getItem('userEmail'),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        shippingAddress: shippingAddress,
        totalAmount: totalAmount,
        currency: 'Pi',
        timestamp: Date.now(),
        source: 'sapi_checkout'
      };

      // Créer la commande dans SAPI avant le paiement
      await createSAPIOrder(metadata);

      // Lancer le paiement Pi
      setPaymentStatus('Connexion à Pi Network...');
      await piPaymentService.createPayment(
        amountInPi,
        `Achat SAPI - Commande ${currentOrderId}`,
        metadata
      );

      setPaymentStatus('Paiement en cours de traitement...');

    } catch (error) {
      console.error('Erreur paiement Pi:', error);
      setPaymentStatus(`Erreur: ${error.message}`);
      if (onPaymentError) onPaymentError(error);
      
      // Annuler la commande SAPI en cas d'erreur
      await cancelSAPIOrder(currentOrderId);
    }
  };

  const createSAPIOrder = async (metadata) => {
    try {
      // Ici, intègre avec ta logique SAPI existante
      // Ex: créer une commande dans Firestore avec statut 'pending_payment'
      const orderData = {
        orderId: metadata.orderId,
        userId: metadata.userId,
        items: metadata.items,
        totalAmount: metadata.totalAmount,
        shippingAddress: metadata.shippingAddress,
        paymentMethod: 'pi_network',
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        paymentStatus: 'initiated'
      };

      // Ajoute selon ta structure SAPI
      // await db.collection('orders').doc(metadata.orderId).set(orderData);
      
      console.log('Commande SAPI créée:', orderData);
      return orderData;
      
    } catch (error) {
      console.error('Erreur création commande SAPI:', error);
      throw new Error('Impossible de créer la commande');
    }
  };

  const cancelSAPIOrder = async (orderId) => {
    try {
      // Mettre à jour le statut de la commande en 'cancelled'
      // await db.collection('orders').doc(orderId).update({
      //   status: 'cancelled',
      //   cancelledAt: new Date().toISOString()
      // });
      
      console.log('Commande SAPI annulée:', orderId);
    } catch (error) {
      console.error('Erreur annulation commande:', error);
    }
  };

  // Gestion du succès (appelé par le service)
  const handlePaymentSuccess = (paymentResult) => {
    setPaymentStatus('Paiement réussi ! Redirection...');
    setLoading(false);
    
    // Mettre à jour la commande SAPI
    updateOrderAfterPayment(paymentResult);
    
    // Appeler le callback parent
    if (onPaymentSuccess) {
      onPaymentSuccess({
        paymentMethod: 'pi_network',
        orderId: currentOrderId,
        paymentResult: paymentResult
      });
    }
    
    // Fermer la modal après 2 secondes
    setTimeout(() => {
      setShowModal(false);
    }, 2000);
  };

  const updateOrderAfterPayment = (paymentResult) => {
    // Mettre à jour la commande dans SAPI
    const updateData = {
      status: 'paid',
      paymentStatus: 'completed',
      paymentId: paymentResult.identifier,
      paidAt: new Date().toISOString(),
      transactionId: paymentResult.transaction?.txid
    };
    
    console.log('Mise à jour commande après paiement:', updateData);
    // Intégration avec ta logique SAPI
    // await db.collection('orders').doc(currentOrderId).update(updateData);
  };

  return (
    <>
      <Card className="pi-payment-card mb-3">
        <Card.Body>
          <div className="d-flex align-items-center mb-3">
            <img 
              src="/pi-network-logo.png" 
              alt="Pi Network" 
              className="pi-logo me-3"
              style={{ width: '40px', height: '40px' }}
            />
            <div>
              <h5 className="mb-0">Payer avec Pi Network</h5>
              <small className="text-muted">
                {isPiReady ? '✅ Disponible' : '❌ Ouvrir dans le navigateur Pi'}
              </small>
            </div>
          </div>
          
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Montant: {(totalAmount / 100).toFixed(2)} Pi</strong>
              <br />
              <small className="text-muted">
                ≈ ${totalAmount / 100} USD
              </small>
            </div>
            
            <Button 
              variant="primary" 
              onClick={handlePiPayment}
              disabled={loading || !isPiReady || !cartItems?.length}
              className="pi-payment-btn"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Traitement...
                </>
              ) : (
                '💳 Payer avec Pi'
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Paiement Pi Network</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="d-flex align-items-center">
            {loading ? (
              <Spinner animation="border" size="sm" className="me-3" />
            ) : (
              <span className="me-2">ℹ️</span>
            )}
            {paymentStatus}
          </Alert>
          
          <div className="text-center mt-3">
            <small className="text-muted">
              N'oubliez pas de confirmer le paiement dans votre app Pi Network
            </small>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PiPaymentIntegration;