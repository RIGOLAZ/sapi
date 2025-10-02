// src/pages/checkout-success/CheckoutSuccess.js
import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaShoppingBag } from 'react-icons/fa';
import styles from "./CheckoutSuccess.module.css";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const txid = searchParams.get('txid');
  const amount = searchParams.get('amount');

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

        <div className={styles.succcessActions}>
          <Link to="/" className={styles.continueShopping}>
            <FaShoppingBag />
            Continuer les achats
          </Link>
          <Link to="/order-history" className={styles.viewOrders}>
            Voir mes commandes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;