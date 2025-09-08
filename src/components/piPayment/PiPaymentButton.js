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
      const intentResult = await createPiPaymentIntent({
        items: cartItems,
        amount: totalAmount,
        customerEmail
      });

      const { paymentId } = intentResult.data;

      const payment = await window.Pi.createPayment({
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

    } catch (error) {
      console.error('Pi payment error:', error);
      toast.error(error.message || 'Payment failed');
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