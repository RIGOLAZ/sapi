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

// Composant de débogage Pi Browser - VERSION CORRIGÉE
const PiBrowserDebug = () => {
  // Vérification DIRECTE et PRÉCISE
  const sdkReallyLoaded = typeof window.Pi !== 'undefined';
  const createPaymentAvailable = sdkReallyLoaded && typeof window.Pi.createPayment === 'function';
  const authenticateAvailable = sdkReallyLoaded && typeof window.Pi.authenticate === 'function';
  
  const hostname = window.location.hostname;
  const isProduction = hostname === 'sapi.etralis.com';
  const isSandbox = hostname === 'localhost' || hostname.includes('sandbox.minepi.com');
  
  // Utilisation correcte des hooks
  const { piUser, isAuthenticated } = usePiAuth();
  const { isProcessing, paymentError, currentPayment } = usePiPayment();

  return (
    <div className={styles.debugPanel}>
      <h4>🐛 Debug Pi Browser - VÉRIFICATION DIRECTE</h4>
      <div className={styles.debugGrid}>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>📍 Domaine:</span>
          <span className={styles.debugValue}>{hostname}</span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>🌍 Environnement:</span>
          <span className={`${styles.debugValue} ${isProduction ? styles.prod : styles.sandbox}`}>
            {isProduction ? 'PRODUCTION' : 'SANDBOX'}
          </span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>🔧 SDK Pi:</span>
          <span className={sdkReallyLoaded ? styles.success : styles.error}>
            {sdkReallyLoaded ? '✅ Chargé' : '❌ Non chargé'}
          </span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>💳 createPayment:</span>
          <span className={createPaymentAvailable ? styles.success : styles.error}>
            {createPaymentAvailable ? '✅ Disponible' : '❌ Indisponible'}
          </span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>🔐 authenticate:</span>
          <span className={authenticateAvailable ? styles.success : styles.error}>
            {authenticateAvailable ? '✅ Disponible' : '❌ Indisponible'}
          </span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>🔐 Authentifié:</span>
          <span className={isAuthenticated ? styles.success : styles.error}>
            {isAuthenticated ? `✅ ${piUser?.username || 'Utilisateur Pi'}` : '❌ Non'}
          </span>
        </div>
        <div className={styles.debugItem}>
          <span className={styles.debugLabel}>💰 Paiement en cours:</span>
          <span className={isProcessing ? styles.processing : styles.success}>
            {isProcessing ? '🔄 Oui' : '✅ Non'}
          </span>
        </div>
      </div>
      
      <div className={styles.debugInfo}>
        <strong>🎯 État réel : {sdkReallyLoaded ? 'OPÉRATIONNEL' : 'NON CHARGÉ'}</strong>
        <p>Le SDK Pi est {sdkReallyLoaded ? 'correctement chargé' : 'absent ou non chargé'}</p>
      </div>

      {paymentError && (
        <div className={styles.debugWarning}>
          ⚠️ <strong>Erreur de paiement:</strong> {paymentError}
        </div>
      )}
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
  const handlePiPayment = async () => {
    console.log('🎯 Début processus paiement - Diagnostic:');
    console.log('- SDK Pi:', !!window.Pi);
    console.log('- Authentifié:', isAuthenticated);
    console.log('- Utilisateur:', piUser?.username);
    console.log('- Pi Browser:', isPiBrowser);

    // Vérification améliorée de l'environnement
    const sdkAvailable = typeof window.Pi !== 'undefined' && typeof window.Pi.createPayment === 'function';
    
    if (!sdkAvailable) {
      toast.error("SDK Pi non disponible", {
        position: "bottom-right"
      });
      return;
    }

    if (!isAuthenticated) {
      try {
        console.log('🔐 Lancement authentification...');
        setPiLoading(true);
        await authenticatePi();
        console.log('✅ Authentification réussie');
        
        // Synchronisation après auth
        setTimeout(() => {
          syncWithSDK?.();
        }, 1000);
        
        return;
      } catch (error) {
        console.error('❌ Erreur authentification:', error);
        toast.error("Échec de l'authentification Pi", {
          position: "bottom-right"
        });
        return;
      } finally {
        setPiLoading(false);
      }
    }

    setPiLoading(true);
    setPaymentStatus('processing');

    try {
      const orderId = generateOrderId();
      console.log('📦 Création commande:', orderId);
      
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
        items: [...cartItems],
        totalAmount: cartTotalAmount,
        totalQuantity: cartTotalQuantity,
        status: 'pending_payment',
        paymentMethod: 'pi_network',
        createdAt: new Date().toISOString(),
        piUser: piUser?.username
      };
      
      saveOrderToLocalStorage(orderData);
      console.log('🚀 Appel à initiatePayment...');
      await initiatePayment(paymentData);
      console.log('✅ Paiement initié avec succès');
      
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

    // 2. INCRÉMENTER les stats admin
    dispatch(INCREMENT_ORDER_STATS({ 
      amount: cartTotalAmount 
    }));
      
      // Vider le panier après un délai
      setTimeout(() => {
        dispatch(CLEAR_CART());
        setPaymentStatus('idle');
      }, 3000);
    }
  }, [currentPayment, dispatch, cartTotalAmount]);

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