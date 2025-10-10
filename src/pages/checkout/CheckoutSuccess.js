// src/pages/checkout-success/CheckoutSuccess.js
import React, { useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaCheckCircle, FaShoppingBag } from 'react-icons/fa';
import styles from "./CheckoutSuccess.module.css";
import { CLEAR_CART } from '../../redux/slice/cartSlice';
import { RESET_AFTER_PAYMENT } from '../../redux/slice/orderSlice';
import { INCREMENT_ORDER_STATS } from '../../redux/slice/authSlice';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order');
  const txid = searchParams.get('txid');
  const amount = searchParams.get('amount');
  
  const { cartItems, cartTotalAmount } = useSelector((state) => state.cart);

  useEffect(() => {
    // S'assurer que nous sommes sur une vraie page de succès
    if (orderId && txid) {
      console.log('Payment successful, clearing cart...');
      
      // 1. Réinitialiser IMMÉDIATEMENT le panier
      dispatch(CLEAR_CART());
      
      // 2. Réinitialiser l'état de commande
      dispatch(RESET_AFTER_PAYMENT());
      
      // 3. Mettre à jour les stats admin si montant disponible
      if (amount) {
        const numericAmount = parseFloat(amount) || cartTotalAmount || 0;
        if (numericAmount > 0) {
          dispatch(INCREMENT_ORDER_STATS({ amount: numericAmount }));
        }
      }
      
      // 4. Nettoyer le localStorage
      localStorage.removeItem('sapi_cart');
      localStorage.removeItem('currentOrder');
      
      console.log('Cart cleared successfully');
    } else {
      // Rediriger si pas de paramètres valides
      console.warn('Invalid success parameters, redirecting...');
      navigate('/cart');
    }
  }, [dispatch, orderId, txid, amount, cartTotalAmount, navigate]);

  // S'assurer que le panier est vide même si useEffect rate
  useEffect(() => {
    // Vérifier et forcer le nettoyage au montage
    if (cartItems.length > 0) {
      console.warn('Cart still has items, forcing cleanup...');
      dispatch(CLEAR_CART());
      localStorage.removeItem('sapi_cart');
    }
  }, [cartItems.length, dispatch]);

  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>
        <FaCheckCircle className={styles.successIcon} />
        <h1>Paiement Réussi !</h1>
        <p className={styles.successMessage}>
          Merci pour votre achat. Votre commande a été traitée avec succès.
        </p>
        
        <div className={styles.orderDetails}>
          <h3>Détails de la commande</h3>
          <div className={styles.detailRow}>
            <span>Numéro de commande:</span>
            <strong>{orderId}</strong>
          </div>
          <div className={styles.detailRow}>
            <span>Transaction:</span>
            <code>{txid}</code>
          </div>
          <div className={styles.detailRow}>
            <span>Montant payé:</span>
            <strong>{amount} Pi</strong>
          </div>
        </div>

        <div className={styles.successActions}>
          <Link 
            to="/" 
            className={styles.continueShopping}
            onClick={() => {
              // Double sécurité au clic
              dispatch(CLEAR_CART());
              localStorage.removeItem('sapi_cart');
            }}
          >
            <FaShoppingBag />
            Continuer les achats
          </Link>
          <Link to="/order-history" className={styles.viewOrders}>
            Voir mes commandes
          </Link>
        </div>
        
        {/* Debug info - à enlever en production */}
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: '#f8f9fa', 
          borderRadius: '5px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Debug:</strong> Cart items: {cartItems.length} | 
          Total: {cartTotalAmount} | 
          Order: {orderId}
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;