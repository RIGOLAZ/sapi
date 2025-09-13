import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCartSync } from '../../hooks/useCartSync';
import { db } from '../../firebase/config';
import PayWithPi from '../../components/piPayment/PayWithPi';
// import './Cart.css'; // Décommente quand le fichier CSS sera créé

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, user, removeFromCart, clearCart } = useCartSync();
  const [showPiPayment, setShowPiPayment] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Créer une commande
  const createOrder = async () => {
    if (!user || cartItems.length === 0) return null;

    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        items: cartItems,
        totalAmount: cartTotal,
        currency: 'Pi',
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'pi_network',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('Commande créée avec ID:', orderRef.id);
      return orderRef.id;
    } catch (error) {
      console.error('Erreur création commande:', error);
      alert('Erreur lors de la création de la commande');
      return null;
    }
  };

  // Gérer le paiement avec Pi
  const handlePiPayment = async () => {
    if (!user) {
      alert('Veuillez vous connecter pour continuer');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      alert('Votre panier est vide');
      return;
    }

    setLoading(true);
    const newOrderId = await createOrder();
    
    if (newOrderId) {
      setOrderId(newOrderId);
      setShowPiPayment(true);
    } else {
      alert('Erreur lors de la création de la commande');
    }
    setLoading(false);
  };

  // Succès du paiement
  const handlePaymentSuccess = async (paymentInfo) => {
    console.log('Paiement réussi:', paymentInfo);
    
    try {
      // Mettre à jour la commande comme payée
      if (orderId) {
        await updateDoc(doc(db, 'orders', orderId), {
          paymentStatus: 'paid',
          paidAt: serverTimestamp(),
          txid: paymentInfo.txid,
          updatedAt: serverTimestamp()
        });
      }
      
      // Vider le panier
      await clearCart();
      
      // Rediriger vers la page de succès
      navigate(`/payment-success?order=${orderId}&txid=${paymentInfo.txid}`);
      
    } catch (error) {
      console.error('Erreur traitement paiement réussi:', error);
    }
  };

  // Annulation du paiement
  const handlePaymentCancel = () => {
    setShowPiPayment(false);
    setOrderId(null);
  };

  // Affichage du panier
  if (showPiPayment && orderId) {
    return (
      <PayWithPi
        amount={cartTotal}
        orderId={orderId}
        userId={user?.uid}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentCancel={handlePaymentCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="cart-loading">
        <div className="spinner"></div>
        <p>Chargement du paiement...</p>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Mon Panier</h1>
        {!user && (
          <div className="auth-prompt">
            <p>Connectez-vous pour sauvegarder votre panier</p>
            <button onClick={() => navigate('/login')} className="btn-login">
              Se connecter
            </button>
          </div>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des articles pour commencer vos achats</p>
          <button onClick={() => navigate('/products')} className="btn-continue-shopping">
            Continuer mes achats
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image || '/placeholder-product.png'} alt={item.name} />
                </div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">{item.price} π</p>
                  <p className="item-description">{item.description}</p>
                </div>
                <div className="item-controls">
                  <div className="quantity-control">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="btn-quantity"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      onClick={() => {
                        const updatedItem = { ...item, quantity: item.quantity + 1 };
                        // Logique pour ajouter la même quantité
                        // Cette partie sera gérée par useCartSync
                      }}
                      className="btn-quantity"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="btn-remove"
                  >
                    Supprimer
                  </button>
                </div>
                <div className="item-total">
                  {(item.price * item.quantity).toFixed(2)} π
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Sous-total:</span>
              <span>{cartTotal.toFixed(2)} π</span>
            </div>
            <div className="summary-row">
              <span>Frais de livraison:</span>
              <span>0.00 π</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>{cartTotal.toFixed(2)} π</span>
            </div>
            
            <button 
              onClick={handlePiPayment}
              className="btn-pi-payment"
              disabled={loading}
            >
              {loading ? 'Chargement...' : `Payer ${cartTotal.toFixed(2)} π avec Pi Network`}
            </button>
            
            <div className="payment-info">
              <p>🔒 Paiement sécurisé via Pi Network</p>
              <p>Aucune information bancaire requise</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;