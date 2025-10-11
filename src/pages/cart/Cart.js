import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';
import { currency } from "..";
import { usePiDetection } from '../../hooks/usePiDetection.js';
import { INCREMENT_ORDER_STATS } from "../../redux/slice/authSlice";
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
  FaExclamationTriangle,
  FaLock,
  FaUserCheck
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { usePiPayment } from "../../hooks/usePiPayment.js";
import { usePiAuth } from "../../hooks/usePiAuth.js";

// Composant de debug amélioré pour Pi Browser
const PiBrowserDebug = () => {
  const [sdkState, setSdkState] = useState({
    loaded: false,
    functions: {}
  });

  useEffect(() => {
    const checkSDK = () => {
      const sdk = window.Pi;
      setSdkState({
        loaded: !!sdk,
        functions: {
          createPayment: typeof sdk?.createPayment,
          authenticate: typeof sdk?.authenticate,
          user: sdk?.user ? 'present' : 'absent'
        }
      });
    };

    // Vérifier immédiatement
    checkSDK();

    // Vérifier périodiquement (important pour Pi Browser)
    const interval = setInterval(checkSDK, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.debugPanel}>
      <h4>🔍 Diagnostic Temps Réel Pi Browser</h4>
      <div className={styles.debugGrid}>
        <div className={styles.debugItem}>
          <span>SDK Chargé:</span>
          <span className={sdkState.loaded ? styles.success : styles.error}>
            {sdkState.loaded ? '✅' : '❌'}
          </span>
        </div>
        {Object.entries(sdkState.functions).map(([key, value]) => (
          <div key={key} className={styles.debugItem}>
            <span>{key}:</span>
            <span className={value ? styles.success : styles.error}>
              {value ? '✅' : '❌'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Cart = () => {
  const { isPiBrowser, isPiLoaded } = usePiDetection();
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [piLoading, setPiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');

  // Hooks Pi Network - VERSION CORRECTE
  const { 
    initiatePayment, 
    isProcessing, 
    paymentError,
    currentPayment,
    piEnvironment 
  } = usePiPayment();

  const {
    piUser,
    isAuthenticated,
    authenticatePi,
    checkRealAuthState,
    syncWithSDK
  } = usePiAuth();

  // Synchronisation automatique avec le SDK
  useEffect(() => {
    console.log('🔄 Cart - Synchronisation avec SDK Pi');
    syncWithSDK?.();
  }, [syncWithSDK]);

  // Diagnostic amélioré
  useEffect(() => {
    console.log('🔍 DIAGNOSTIC CART COMPLET:');
    console.log('- SDK Pi disponible:', typeof window.Pi !== 'undefined');
    console.log('- createPayment disponible:', typeof window.Pi?.createPayment);
    console.log('- Authentifié:', isAuthenticated);
    console.log('- Utilisateur:', piUser?.username);
    console.log('- Pi Browser détecté:', isPiBrowser);
    console.log('- Environnement Pi:', piEnvironment);
  }, [isAuthenticated, piUser, isPiBrowser, piEnvironment]);

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

  // Paiement Pi Network - VERSION AMÉLIORÉE
  // Dans votre Cart.js - PARTIE CRITIQUE CORRIGÉE
const handlePiPayment = async () => {
  console.log('🎯 Début processus paiement - Environnement:', piEnvironment);
  
  // VÉRIFICATION ROBUSTE DU SDK
  const sdkAvailable = typeof window.Pi !== 'undefined';
  const paymentAvailable = sdkAvailable && typeof window.Pi.createPayment === 'function';
  
  console.log('📋 État SDK:', { sdkAvailable, paymentAvailable, piEnvironment });

  if (!sdkAvailable) {
    toast.error("🚫 SDK Pi non chargé. Ouvrez dans Pi Browser.", {
      position: "bottom-right"
    });
    return;
  }

  if (!paymentAvailable) {
    toast.error("❌ Fonction de paiement indisponible", {
      position: "bottom-right"
    });
    return;
  }

  // Authentification d'abord
  if (!isAuthenticated) {
    try {
      console.log('🔐 Authentification nécessaire...');
      setPiLoading(true);
      
      await authenticatePi();
      console.log('✅ Authentifié, re-vérification...');
      
      // Re-vérifier l'état après auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      const realAuth = await checkRealAuthState();
      
      if (!realAuth) {
        throw new Error('Échec de la vérification post-authentification');
      }
      
      console.log('✅ Prêt pour paiement après auth');
      return; // L'utilisateur devra recliquer sur payer
      
    } catch (error) {
      console.error('❌ Erreur auth:', error);
      toast.error(`🔐 Erreur authentification: ${error.message}`, {
        position: "bottom-right"
      });
      return;
    } finally {
      setPiLoading(false);
    }
  }

  // PROCÉDER AU PAIEMENT
  setPiLoading(true);
  setPaymentStatus('processing');

  try {
    const orderId = generateOrderId();
    console.log('📦 Création commande pour paiement:', orderId);

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
        timestamp: new Date().toISOString(),
        environment: piEnvironment // Ajouter l'environnement
      }
    };

    console.log('💰 Données paiement:', paymentData);
    await initiatePayment(paymentData);
    
  } catch (error) {
    console.error('💥 Erreur paiement:', error);
    setPaymentStatus('error');
    toast.error(`❌ Paiement échoué: ${error.message}`, {
      position: "bottom-right",
      autoClose: 5000
    });
  } finally {
    setPiLoading(false);
  }
};

  // Gérer les erreurs de paiement
  useEffect(() => {
    if (paymentError) {
      setPaymentStatus('error');
    }
  }, [paymentError]);

  // Gérer les paiements réussis
  useEffect(() => {
    if (currentPayment && currentPayment.status === 'completed') {
      console.log('🎉 Paiement réussi détecté, vidage du panier...');

      setPaymentStatus('success');
      toast.success("🎉 Paiement réussi ! Votre commande est confirmée.", {
        position: "bottom-right",
        autoClose: 5000
      });
      // VIDER IMMÉDIATEMENT le panier
    dispatch(CLEAR_CART());
      
      // Vider le panier après un délai
      setTimeout(() => {
        dispatch(CLEAR_CART());
        setPaymentStatus('idle');
      }, 3000);
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

          {/* Section debug réduite et CORRECTE */}
          <div className={styles.miniDebug}>
            <div className={styles.debugStatus}>
              <span className={isPiBrowser ? styles.statusOk : styles.statusError}>
                Pi Browser: {isPiBrowser ? '✅' : '❌'}
              </span>
              {isAuthenticated && (
                <span className={styles.userMini}>
                  <FaUserCheck /> {piUser?.username}
                </span>
              )}
            </div>
            <div className={styles.debugStatus}>
              <span className={typeof window.Pi !== 'undefined' ? styles.statusOk : styles.statusError}>
                SDK Pi: {typeof window.Pi !== 'undefined' ? '✅' : '❌'}
              </span>
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
          <h1 className={styles.title}>
            <FaShoppingBag />
            Panier d'achat
          </h1>
          <p className={styles.itemsCount}>
            {cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''} dans votre panier
          </p>
        </div>
        
        <div className={styles.piStatus}>
          <div className={`${styles.statusIndicator} ${isPiBrowser ? styles.connected : styles.disconnected}`}>
            {isPiBrowser ? '✅ Pi Browser' : '❌ Pi Browser requis'}
          </div>
          {isAuthenticated && (
            <div className={styles.userInfo}>
              <FaUserCheck />
              <span>Connecté: {piUser?.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel - MAINTENANT PRÉCIS */}
      {process.env.NODE_ENV === 'development' && <PiBrowserDebug />}

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
                    className={`${styles.controlBtn} ${item.cartQuantity <= 1 ? styles.disabled : ''}`}
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

            {/* Bouton paiement Pi - CONDITION AMÉLIORÉE */}
            <button
              className={`${styles.checkoutButton} ${
                piLoading || isProcessing ? styles.disabled : ''
              } ${paymentStatus === 'success' ? styles.success : ''} ${
                paymentStatus === 'error' ? styles.error : ''
              } ${!isAuthenticated ? styles.authRequired : ''}`}
              onClick={handlePiPayment}
              disabled={piLoading || isProcessing}
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
                  Réessayer le paiement
                </>
              ) : !isAuthenticated ? (
                <>
                  <FaUserCheck />
                  Se connecter avec Pi
                </>
              ) : (
                <>
                  <FaLock />
                  Payer {cartTotalAmount.toFixed(2)} π
                </>
              )}
            </button>

            {/* Messages informatifs */}
            <div className={styles.infoMessages}>
              {!isPiBrowser && (
                <div className={`${styles.infoMessage} ${styles.warning}`}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Pi Browser recommandé</strong>
                    <p>Pour une expérience optimale, ouvrez dans l'application Pi Browser</p>
                  </div>
                </div>
              )}

              {isPiBrowser && !isAuthenticated && (
                <div className={`${styles.infoMessage} ${styles.info}`}>
                  <FaUserCheck />
                  <div>
                    <strong>Authentification requise</strong>
                    <p>Vous serez invité à vous connecter avec Pi Network</p>
                  </div>
                </div>
              )}

              {(piLoading || isProcessing) && (
                <div className={`${styles.infoMessage} ${styles.processing}`}>
                  <div className={styles.processingSpinner}></div>
                  <div>
                    <strong>Paiement en cours</strong>
                    <p>Confirmez la transaction dans Pi Wallet</p>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className={`${styles.infoMessage} ${styles.error}`}>
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
                <FaLock />
                <strong>Paiement 100% sécurisé</strong>
              </div>
              <p>Transactions cryptographiques via le réseau Pi Blockchain</p>
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