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
import { usePiPayment } from "../../hooks/usePiPayment";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [piLoading, setPiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error
  const [currentOrderId, setCurrentOrderId] = useState(null); // ✅ Correction: stocker l'orderId

  // Hook Pi Payment
  const { 
    isPiBrowser, 
    loading, 
    error, 
    createPayment,
    testSDK,
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
      orders.unshift(orderData); // Ajouter au début
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
     PAIEMENT PI NETWORK - VERSION CORRIGÉE
  -------------------------------------------------------------- */
  const handlePiPayment = async () => {
    console.log('🛒 Début du processus de paiement Pi');
    
    // Vérifications
    if (!isPiBrowser) {
      toast.info("📱 Ouvrez cette page dans l'application Pi Browser pour payer avec Pi", {
        position: "bottom-right", 
        autoClose: 6000 
      });
      return;
    }

    if (cartItems.length === 0) {
      toast.warning("🛒 Votre panier est vide", { 
        position: "bottom-right",
        autoClose: 3000 
      });
      return;
    }

    setPiLoading(true);
    setPaymentStatus('processing');

    // ✅ CORRECTION: Déclarer orderId au niveau de la fonction
    const orderId = `CMD-${Date.now()}`;
    setCurrentOrderId(orderId); // Stocker pour usage dans les callbacks

    try {
      const amount = cartTotalAmount.toFixed(2);
      
      // Préparation des métadonnées
      const metadata = {
        orderId: orderId,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.cartQuantity,
          price: item.price,
          category: item.category
        })),
        totalItems: cartTotalQuantity,
        totalAmount: amount,
        currency: currency,
        timestamp: new Date().toISOString()
      };

      const memo = `Achat de ${cartTotalQuantity} article(s) - ${amount} Pi`;

      console.log('🎯 Commande créée:', orderId);
      console.log('💰 Montant:', amount + ' Pi');

      // Sauvegarde de la commande avant paiement
      saveOrderToLocalStorage({
        ...metadata,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Notification de début de paiement
      toast.info('🚀 Initialisation du paiement Pi...', {
        position: "bottom-right",
        autoClose: 3000
      });

      // Appel du paiement
      const paymentResult = await createPayment(amount, memo, metadata);
      
      console.log('✅✅✅ PAIEMENT RÉUSSI!', paymentResult);
      setPaymentStatus('success');
      
      // Succès du paiement
      toast.success(`🎉 Paiement réussi! Commande: ${orderId}`, {
        position: "bottom-right",
        autoClose: 5000 
      });

      // Mise à jour du statut de la commande
      updateOrderStatus(orderId, 'completed', paymentResult);

      // Vider le panier après un délai
      setTimeout(() => {
        dispatch(CLEAR_CART());
        setCurrentOrderId(null); // Réinitialiser
        
        // Redirection vers la page de succès
        window.location.href = `/checkout-success?order=${orderId}&txid=${paymentResult.txid}&amount=${amount}`;
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur de paiement:', error);
      setPaymentStatus('error');
      
      // Gestion des erreurs utilisateur
      let userMessage = 'Erreur lors du paiement';
      
      if (error.message.includes('annulé') || error.message.includes('cancel')) {
        userMessage = 'Paiement annulé';
      } else if (error.message.includes('Browser') || error.message.includes('Pi Browser')) {
        userMessage = 'Ouvrez dans Pi Browser pour payer avec Pi';
      } else if (error.message.includes('authentification')) {
        userMessage = 'Problème d\'authentification Pi';
      } else if (error.message.includes('solde') || error.message.includes('balance')) {
        userMessage = 'Solde Pi insuffisant';
      }

      toast.error(`❌ ${userMessage}`, {
        position: "bottom-right",
        autoClose: 6000 
      });

      // ✅ CORRECTION: Utiliser orderId qui est maintenant défini
      if (orderId) {
        updateOrderStatus(orderId, 'failed', { error: error.message });
      }

    } finally {
      setPiLoading(false);
      // Réinitialiser le statut après un délai
      setTimeout(() => {
        setPaymentStatus('idle');
        setCurrentOrderId(null);
      }, 3000);
    }
  };

  const testPiSDK = async () => {
    toast.info('🧪 Test du SDK Pi en cours...', { 
      position: "bottom-right",
      autoClose: 3000 
    });
    
    const result = await testSDK();
    
    if (result.success) {
      toast.success(`✅ SDK Pi fonctionnel! Utilisateur: ${result.user.username}`, {
        position: "bottom-right",
        autoClose: 5000
      });
    } else {
      toast.error(`❌ SDK Pi: ${result.error}`, {
        position: "bottom-right", 
        autoClose: 6000
      });
    }
  };

  /* --------------------------------------------------------------
     EFFETS
  -------------------------------------------------------------- */
  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

  // Gestion des erreurs du hook
  useEffect(() => {
    if (error) {
      toast.error(`Erreur Pi: ${error}`, {
        position: "bottom-right",
        autoClose: 5000
      });
    }
  }, [error]);

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
            <h4>🧪 Développement</h4>
            <button 
              onClick={testPiSDK}
              className={styles.testButton}
              disabled={!isPiBrowser}
            >
              Tester SDK Pi
            </button>
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
              ) : (
                <>
                  <span className={styles.piSymbol}>π</span>
                  Payer {cartTotalAmount.toFixed(2)} Pi
                </>
              )}
            </button>

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
                    <p>Ne quittez pas cette page</p>
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

            {/* BOUTON TEST */}
            <button 
              onClick={testPiSDK}
              className={styles.testButton}
              disabled={!isPiBrowser}
            >
              🧪 Tester SDK Pi
            </button>
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