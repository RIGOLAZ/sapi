import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';
import { currency } from "..";
import { usePiDetection } from '../../hooks/usePiDetection.js';
import {
  ADD_TO_CART,
  CALCULATE_SUBTOTAL,
  CALCULATE_TOTAL_QUANTITY,
  CLEAR_CART,
  DECREASE_CART,
  REMOVE_FROM_CART,
  SAVE_URL,
  selectCartItems,
  selectCartTotalAmount,
  selectCartTotalQuantity,
} from "../../redux/slice/cartSlice.js";
import styles from "./Cart.module.css";
import { 
  FaTrashAlt, 
  FaPlus, 
  FaMinus, 
  FaShoppingBag, 
  FaTimes,
  FaCheck,
  FaExclamationTriangle
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { usePiPayment } from "../../hooks/usePiPayment.js";
import { usePiAuth } from "../../hooks/usePiAuth.js";

const Cart = () => {
  const { isPiBrowser, isPiLoaded } = usePiDetection();
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [piLoading, setPiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');

  // Hooks Pi Network
  const { 
    initiatePayment, 
    isProcessing, 
    paymentError,
    currentPayment 
  } = usePiPayment();

  const {
    piUser,
    isAuthenticated,
    authenticatePi,
  } = usePiAuth();

  // Fonctions du panier
  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
    toast.success(`${cart.name} ajouté au panier`, { 
      position: "bottom-right",
      autoClose: 2000 
    });
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
    toast.info(`Quantité de ${cart.name} réduite`, { 
      position: "bottom-right",
      autoClose: 2000 
    });
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
    toast.error(`${cart.name} retiré du panier`, { 
      position: "bottom-right",
      autoClose: 2000 
    });
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
    toast.info('Panier vidé', { 
      position: "bottom-right",
      autoClose: 2000 
    });
  };

  // Fonctions utilitaires
  const generateOrderId = () => {
    return `SAPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const saveOrderToLocalStorage = (orderData) => {
    try {
      const orders = JSON.parse(localStorage.getItem('sapi_orders') || '[]');
      orders.unshift(orderData);
      localStorage.setItem('sapi_orders', JSON.stringify(orders));
      console.log('💾 Commande sauvegardée:', orderData.orderId);
    } catch (error) {
      console.error('❌ Erreur sauvegarde commande:', error);
    }
  };

  // Paiement Pi Network
  const handlePiPayment = async () => {
    if (!isPiBrowser) {
      toast.error("Veuillez ouvrir dans Pi Browser", {
        position: "bottom-right"
      });
      return;
    }

    if (!isAuthenticated) {
      try {
        await authenticatePi();
        return;
      } catch (error) {
        toast.error("Échec de l'authentification Pi", {
          position: "bottom-right"
        });
        return;
      }
    }

    setPiLoading(true);
    setPaymentStatus('processing');

    try {
      const orderId = generateOrderId();
      
      const paymentData = {
        amount: cartTotalAmount,
        memo: `Commande SAPI - ${orderId}`,
        metadata: {
          orderId: orderId,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.cartQuantity,
            price: item.price
          })),
          totalAmount: cartTotalAmount,
          totalQuantity: cartTotalQuantity,
          timestamp: new Date().toISOString()
        }
      };

      const orderData = {
        orderId,
        items: cartItems,
        totalAmount: cartTotalAmount,
        totalQuantity: cartTotalQuantity,
        status: 'pending_payment',
        paymentMethod: 'pi_network',
        createdAt: new Date().toISOString()
      };
      
      saveOrderToLocalStorage(orderData);
      await initiatePayment(paymentData);
      
    } catch (error) {
      console.error('❌ Erreur paiement Pi:', error);
      setPaymentStatus('error');
      toast.error(`Erreur paiement: ${error.message}`, {
        position: "bottom-right"
      });
    } finally {
      setPiLoading(false);
    }
  };

  // Gérer les erreurs de paiement
  useEffect(() => {
    if (paymentError) {
      setPaymentStatus('error');
      toast.error(`Erreur paiement: ${paymentError}`, {
        position: "bottom-right"
      });
    }
  }, [paymentError]);

  // Gérer les paiements réussis
  useEffect(() => {
    if (currentPayment && currentPayment.status === 'completed') {
      setPaymentStatus('success');
      toast.success("Paiement réussi !", {
        position: "bottom-right"
      });
      
      setTimeout(() => {
        dispatch(CLEAR_CART());
      }, 2000);
    }
  }, [currentPayment, dispatch]);

  // Calculer le sous-total et la quantité
  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

  // Panier vide
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}>
            <FaShoppingBag />
          </div>
          <h2>Votre panier est vide</h2>
          <p>Découvrez nos produits et ajoutez-les à votre panier</p>
          
          <Link to="/#products" className={styles.continueShopping}>
            <FaShoppingBag />
            Découvrir les produits
          </Link>

          <div className={styles.debugSection}>
            <div className={styles.debugInfo}>
              <span>Pi Browser: {isPiBrowser ? '✅ Détecté' : '❌ Non détecté'}</span>
              {isAuthenticated && <span>Utilisateur: {piUser?.username}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      {/* En-tête */}
      <div className={styles.cartHeader}>
        <div className={styles.headerContent}>
          <h1>
            <FaShoppingBag />
            Panier d'achat
          </h1>
          <p className={styles.itemsCount}>
            {cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''} dans votre panier
          </p>
        </div>
        
        <div className={styles.piStatus}>
          <div className={`${styles.statusIndicator} ${isPiBrowser ? styles.connected : styles.disconnected}`}>
            {isPiBrowser ? '✅ Pi Browser' : '❌ Pi Browser'}
          </div>
          {isAuthenticated && (
            <div className={styles.userInfo}>
              <span>Connecté: {piUser?.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className={styles.cartContent}>
        {/* Section articles */}
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h2>Produits sélectionnés</h2>
            <button 
              className={styles.clearButton} 
              onClick={clearCart}
              disabled={cartItems.length === 0}
            >
              <FaTrashAlt />
              Vider le panier
            </button>
          </div>

          <div className={styles.itemsList}>
            {cartItems.map((item) => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemImage}>
                  <img src={item.imageURL} alt={item.name} />
                </div>
                
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <p className={styles.itemCategory}>{item.category}</p>
                  <p className={styles.itemPrice}>{currency} {item.price}</p>
                </div>

                <div className={styles.itemControls}>
                  <button
                    className={styles.controlBtn}
                    onClick={() => decreaseCart(item)}
                    disabled={item.cartQuantity <= 1}
                    title="Réduire la quantité"
                  >
                    <FaMinus />
                  </button>
                  <span className={styles.quantity}>{item.cartQuantity}</span>
                  <button
                    className={styles.controlBtn}
                    onClick={() => increaseCart(item)}
                    title="Augmenter la quantité"
                  >
                    <FaPlus />
                  </button>
                </div>

                <div className={styles.itemTotal}>
                  {currency} {(item.price * item.cartQuantity).toFixed(2)}
                </div>

                <button
                  className={styles.removeBtn}
                  onClick={() => removeFromCart(item)}
                  title="Supprimer l'article"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section résumé */}
        <div className={styles.cartSummary}>
          <div className={styles.summaryCard}>
            <h2>Résumé de la commande</h2>
            
            <div className={styles.summaryDetails}>
              <div className={styles.summaryRow}>
                <span>Sous-total ({cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''})</span>
                <span>{currency} {cartTotalAmount.toFixed(2)}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span>Frais de livraison</span>
                <span className={styles.free}>Gratuits</span>
              </div>
              
              <div className={styles.summaryTotal}>
                <span>Total à payer</span>
                <span className={styles.totalAmount}>
                  {currency} {cartTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bouton paiement Pi */}
            <button
              className={`${styles.checkoutButton} ${
                !isPiBrowser || piLoading || isProcessing ? styles.disabled : ''
              } ${paymentStatus === 'success' ? styles.success : ''} ${
                paymentStatus === 'error' ? styles.error : ''
              }`}
              onClick={handlePiPayment}
              disabled={!isPiBrowser || piLoading || isProcessing}
            >
              {piLoading || isProcessing ? (
                <>
                  <span className={styles.spinner}></span>
                  Traitement en cours...
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <FaCheck />
                  Paiement réussi !
                </>
              ) : paymentStatus === 'error' ? (
                <>
                  <FaExclamationTriangle />
                  Erreur de paiement
                </>
              ) : !isAuthenticated ? (
                <>
                  Se connecter avec Pi
                </>
              ) : (
                <>
                  Payer {cartTotalAmount.toFixed(2)} π
                </>
              )}
            </button>

            {/* Messages informatifs */}
            <div className={styles.infoMessages}>
              {!isPiBrowser && (
                <div className={styles.infoMessage}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Pi Browser requis</strong>
                    <p>Ouvrez cette page dans l'application Pi Browser pour payer avec Pi</p>
                  </div>
                </div>
              )}

              {isPiBrowser && !isAuthenticated && (
                <div className={styles.infoMessage}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Authentification requise</strong>
                    <p>Vous serez invité à vous connecter avec Pi Network</p>
                  </div>
                </div>
              )}

              {(piLoading || isProcessing) && (
                <div className={styles.infoMessage}>
                  <div className={styles.processingSpinner}></div>
                  <div>
                    <strong>Paiement en cours</strong>
                    <p>Confirmez la transaction dans Pi Wallet</p>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className={styles.infoMessage}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Erreur de paiement</strong>
                    <p>{paymentError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Note de sécurité */}
            <div className={styles.securityNote}>
              <div className={styles.securityHeader}>
                <FaCheck />
                <strong>Paiement sécurisé</strong>
              </div>
              <p>Transactions cryptographiques via Pi Network</p>
            </div>
          </div>

          {/* Lien continuer les achats */}
          <Link to="/#products" className={styles.continueLink}>
            <FaShoppingBag />
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;