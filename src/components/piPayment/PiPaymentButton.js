import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  selectCartItems, 
  selectCartTotalAmount,
  CLEAR_CART 
} from '../../redux/slice/cartSlice';
import { selectEmail, selectUserID } from '../../redux/slice/authSlice';
import { functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import styles from './PiPaymentButton.module.css';

const PiPaymentButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPiAvailable, setIsPiAvailable] = useState(false);
  
  const cartItems = useSelector(selectCartItems);
  const totalAmount = useSelector(selectCartTotalAmount);
  const customerEmail = useSelector(selectEmail);
  const userId = useSelector(selectUserID);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  
  const createPiPaymentIntent = httpsCallable(functions, 'createPiPaymentIntent');
  const verifyPiPayment = httpsCallable(functions, 'verifyPiPayment');

  useEffect(() => {
    if (window.Pi) {
      setIsPiAvailable(true);
      initializePi();
    }
  }, []);

  const initializePi = async () => {
    try {
      await window.Pi.init({ 
        version: "2.0",
        sandbox: process.env.REACT_APP_PI_SANDBOX === "true" || false
      });
    } catch (error) {
      console.error("Pi initialization failed", error);
      toast.error("Pi Network initialization failed");
    }
  };

  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, loading, pending, completed, failed
  
  const handlePiPayment = async () => {
  if (!window.Pi) {
    toast.error("Pi Network not available. Please use Pi Browser.");
    return;
  }

  if (!userId) {
    toast.error("Please login to continue");
    navigate('/login');
    return;
  }

  setIsLoading(true);

  try {
    // Étape 1: Créer l'intention de paiement côté serveur
    const intentResult = await createPiPaymentIntent({
      items: cartItems,
      amount: totalAmount,
      customerEmail
    });

    const { paymentId } = intentResult.data;

    // Étape 2: Ouvrir le wallet Pi Network avec le paymentId
    const payment = await window.Pi.createPayment({
      paymentId: paymentId, // Utilise le paymentId du serveur
      amount: totalAmount,
      memo: `Etralishop purchase - ${customerEmail}`,
      metadata: {
        products: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.cartQuantity,
          price: item.price
        }))
      }
    });

    // Étape 3: Le wallet va gérer la vérification du solde et l'approbation
    // Le paiement sera en statut "pending" jusqu'à ce que l'utilisateur l'approuve

    // Étape 4: Vérifier le paiement après approbation
    if (payment.status === 'completed') {
      const verificationResult = await verifyPiPayment({
        paymentId: payment.identifier,
        txid: payment.transaction?.txid,
        items: cartItems,
        amount: totalAmount,
        customerEmail
      });

      if (verificationResult.data.success) {
        dispatch(CLEAR_CART());
        toast.success(`Payment successful! Order ID: ${verificationResult.data.orderId}`);
        navigate('/checkout-success');
      }
    } else if (payment.status === 'pending') {
      setPaymentStatus('pending');
      toast.info('Payment pending approval in your Pi wallet');
      // Tu peux ajouter un webhook ou polling pour vérifier le statut
    }

  } catch (error) {
    console.error('Pi payment error:', error);
    
    // Gestion spécifique des erreurs
    if (error.code === 'insufficient_balance') {
      toast.error('Insufficient Pi balance in your wallet');
    } else if (error.code === 'user_cancelled') {
      toast.error('Payment cancelled by user');
    } else if (error.code === 'unauthenticated') {
      toast.error('Please login to continue');
      navigate('/login');
    } else {
      toast.error(error.message || 'Payment failed');
    }
  } finally {
    setIsLoading(false);
  }
};

  if (!isPiAvailable) {
    return (
      <div className={styles.piUnavailable}>
        <p>Pi Network wallet not detected.</p>
        <small>Please use Pi Browser or install Pi Network app</small>
      </div>
    );
  }

  return (
    <button 
      className={`--btn --pibtn ${styles.piButton}`}
      onClick={handlePiPayment}
      disabled={isLoading || totalAmount <= 0}
    >
      {isLoading ? (
        <span className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i> Processing Pi Payment...
        </span>
      ) : (
        <>
          Pay {totalAmount} Pi
          <img className={styles.pilo} src={"https://res.cloudinary.com/do8lyndou/image/upload/v1734023109/StorePi_mjubzf.svg"} alt="pilogo"/>
        </>
      )}
    </button>
  );
};

export default PiPaymentButton;