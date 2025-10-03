import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';
import { currency } from "..";
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
} from "../../redux/slice/cartSlice";
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
import usePiPayment from "../../hooks/usePiPayment"
import PiPaymentButton from "../../components/PiPaymentButton/PiPaymentButton";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [piLoading, setPiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error

  // Hook Pi Payment
  const { 
    isPiBrowser, 
    loading, 
    error, 
    createPayment,
    setupPiCallbacks,
    isAuthenticated,
    user
  } = usePiPayment();

  /* --------------------------------------------------------------
     FONCTIONS DU PANIER
  -------------------------------------------------------------- */
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

  /* --------------------------------------------------------------
     FONCTIONS UTILITAIRES
  -------------------------------------------------------------- */
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

  const updateOrderStatus = (orderId, status, additionalData = {}) => {
    try {
      const orders = JSON.parse(localStorage.getItem('sapi_orders') || '[]');
      const updatedOrders = orders.map(order => 
        order.orderId === orderId 
          ? { ...order, status, ...additionalData, updatedAt: new Date().toISOString() }
          : order
      );
      localStorage.setItem('sapi_orders', JSON.stringify(updatedOrders));
      console.log('📝 Statut commande mis à jour:', orderId, status);
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
    }
  };

  /* --------------------------------------------------------------
     PAIEMENT PI NETWORK - NOUVELLE APPROCHE
  -------------------------------------------------------------- */
    const handlePiPayment = async () => {}

  /* --------------------------------------------------------------
     EFFETS
  -------------------------------------------------------------- */
  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

  // Gestion des erreurs du hook

  /* --------------------------------------------------------------
     AFFICHAGE PANIER VIDE
  -------------------------------------------------------------- */
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

          {/* Section debug */}
          <div className={styles.debugSection}>
            <div className={styles.debugInfo}>
              <span>Pi Browser: {isPiBrowser ? '✅ Détecté' : '❌ Non détecté'}</span>
              {isAuthenticated && <span>Utilisateur: {user?.username}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------
     RENDU PRINCIPAL
  -------------------------------------------------------------- */
  return (
    <div className={styles.cartContainer}>
      {/* EN-TÊTE */}
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
        
        {/* STATUT PI */}
        <div className={styles.piStatus}>
          <div className={`${styles.statusIndicator} ${isPiBrowser ? styles.connected : styles.disconnected}`}>
            {isPiBrowser ? '✅ Pi Browser' : '❌ Pi Browser'}
          </div>
          {isAuthenticated && (
            <div className={styles.userInfo}>
              <span>Connecté: {user?.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className={styles.cartContent}>
        {/* SECTION ARTICLES */}
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
                {/* Image */}
                <div className={styles.itemImage}>
                  <img src={item.imageURL} alt={item.name} />
                </div>
                
                {/* Informations */}
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <p className={styles.itemCategory}>{item.category}</p>
                  <p className={styles.itemPrice}>{currency} {item.price}</p>
                </div>

                {/* Contrôles quantité */}
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

                {/* Total article */}
                <div className={styles.itemTotal}>
                  {currency} {(item.price * item.cartQuantity).toFixed(2)}
                </div>

                {/* Suppression */}
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

        {/* SECTION RÉSUMÉ */}
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

            {/* BOUTON PAIEMENT PI */}
            <button
              className={`${styles.checkoutButton} ${
                !isPiBrowser || piLoading || loading ? styles.disabled : ''
              } ${paymentStatus === 'success' ? styles.success : ''}`}
              onClick={handlePiPayment}
              disabled={!isPiBrowser || piLoading || loading}
            >
              {piLoading || loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Traitement en cours...
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <FaCheck />
                  Paiement réussi !
                </>
              ) : paymentStatus === 'processing' ? (
                <>
                  <span className={styles.spinner}></span>
                  Confirmez dans Pi Wallet
                </>
              ) : (
                <>
                  Payer {cartTotalAmount.toFixed(2)} Pi
                </>
              )}
            </button>
            <PiPaymentButton
              amount={cartTotalAmount.toFixed(2)}
              memo={`Achat sur sapi.etralis.com`}
              onSuccess={(payment) => {
                // Sauvegarde la commande, affiche un modal, etc.
              }}
            />
            {/* MESSAGES INFORMATIFS */}
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
                    <p>Vous serez invité à vous connecter avec Pi</p>
                  </div>
                </div>
              )}

              {paymentStatus === 'processing' && (
                <div className={styles.infoMessage}>
                  <div className={styles.processingSpinner}></div>
                  <div>
                    <strong>Paiement en cours</strong>
                    <p>Confirmez la transaction dans Pi Wallet</p>
                  </div>
                </div>
              )}
            </div>

            {/* NOTE DE SÉCURITÉ */}
            <div className={styles.securityNote}>
              <div className={styles.securityHeader}>
                <FaCheck />
                <strong>Paiement sécurisé</strong>
              </div>
              <p>Transactions cryptographiques via Pi Network</p>
            </div>
          </div>

          {/* LIEN CONTINUER LES ACHATS */}
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