import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from 'react-router-dom';
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

const Cart = () => {
  const navigate = useNavigate();
  const { isPiBrowser } = usePiDetection();
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
    currentPayment,
    piEnvironment 
  } = usePiPayment();

  const {
    piUser,
    isAuthenticated,
    authenticatePi,
    syncWithSDK
  } = usePiAuth();

  // Nouvel état pour gérer l'annulation
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);

  // Fonction pour détecter les paiements en attente
  useEffect(() => {
    const checkPendingPayments = async () => {
      try {
        // Vérifier s'il y a des paiements en attente dans le localStorage
        const orders = JSON.parse(localStorage.getItem('sapi_orders') || '[]');
        const pendingOrder = orders.find(order => 
          order.status === 'pending_payment' && order.piPaymentId
        );
        
        if (pendingOrder && pendingOrder.piPaymentId) {
          setPendingPaymentId(pendingOrder.piPaymentId);
          console.log('⚠️ Paiement en attente détecté:', pendingOrder.piPaymentId);
        }
      } catch (error) {
        console.error('Erreur vérification paiements en attente:', error);
      }
    };

    checkPendingPayments();
  }, []);

  // Fonction pour annuler un paiement bloqué
  const handleCancelPendingPayment = async () => {
    if (!pendingPaymentId) return;

    setCancellingPayment(true);
    
    try {
      console.log('🔄 Annulation du paiement bloqué:', pendingPaymentId);
      
      const response = await fetch('https://us-central1-ecomm-f0ae6.cloudfunctions.net/cancelPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: pendingPaymentId,
          reason: 'user_manual_cancellation'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Paiement annulé avec succès');
        
        // Nettoyer le localStorage
        const orders = JSON.parse(localStorage.getItem('sapi_orders') || '[]');
        const updatedOrders = orders.map(order => 
          order.piPaymentId === pendingPaymentId 
            ? { ...order, status: 'cancelled', cancelledAt: new Date().toISOString() }
            : order
        );
        localStorage.setItem('sapi_orders', JSON.stringify(updatedOrders));
        
        setPendingPaymentId(null);
        toast.success('Paiement précédent annulé. Vous pouvez réessayer.', {
          position: "bottom-right",
          autoClose: 5000
        });
      } else {
        throw new Error(result.error || 'Échec de l\'annulation');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation:', error);
      toast.error(`Erreur d'annulation: ${error.message}`, {
        position: "bottom-right",
        autoClose: 5000
      });
    } finally {
      setCancellingPayment(false);
    }
  };

  // Fonction pour récupérer les paiements bloqués automatiquement
  const recoverStuckPayments = async () => {
    try {
      const orders = JSON.parse(localStorage.getItem('sapi_orders') || '[]');
      const stuckOrders = orders.filter(order => 
        order.status === 'pending_payment' && 
        order.createdAt && 
        (Date.now() - new Date(order.createdAt).getTime()) > 300000 // 5 minutes
      );

      for (const order of stuckOrders) {
        if (order.piPaymentId) {
          console.log('🔄 Récupération automatique paiement bloqué:', order.piPaymentId);
          await handleCancelPendingPayment(order.piPaymentId);
        }
      }
    } catch (error) {
      console.error('Erreur récupération automatique:', error);
    }
  };

  // Exécuter la récupération au chargement
  useEffect(() => {
    recoverStuckPayments();
  }, []);

  // Variables de debug (calculées à chaque rendu)
  const sdkReallyLoaded = typeof window.Pi !== 'undefined';
  const createPaymentAvailable = sdkReallyLoaded && typeof window.Pi.createPayment === 'function';
  const authenticateAvailable = sdkReallyLoaded && typeof window.Pi.authenticate === 'function';
  const hostname = window.location.hostname;
  const isProduction = hostname === 'sapi.etralis.com';

  // Synchronisation automatique avec le SDK
  useEffect(() => {
    console.log('🔄 Cart - Synchronisation avec SDK Pi');
    syncWithSDK?.();
  }, [syncWithSDK]);

  // Diagnostic amélioré
  useEffect(() => {
    console.log('🔍 DIAGNOSTIC CART COMPLET:');
    console.log('- SDK Pi disponible:', sdkReallyLoaded);
    console.log('- createPayment disponible:', createPaymentAvailable);
    console.log('- Authentifié:', isAuthenticated);
    console.log('- Utilisateur:', piUser?.username);
    console.log('- Pi Browser détecté:', isPiBrowser);
    console.log('- Environnement Pi:', piEnvironment);
  }, [isAuthenticated, piUser, isPiBrowser, piEnvironment, sdkReallyLoaded, createPaymentAvailable]);

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
    console.log('🎯 Début processus paiement - Diagnostic:');
    console.log('- SDK Pi:', sdkReallyLoaded);
    console.log('- Authentifié:', isAuthenticated);
    console.log('- Utilisateur:', piUser?.username);
    console.log('- Pi Browser:', isPiBrowser);

    if (!sdkReallyLoaded || !createPaymentAvailable) {
      toast.error("SDK Pi non disponible", { position: "bottom-right" });
      return;
    }

    if (!isAuthenticated) {
      try {
        console.log('🔐 Lancement authentification...');
        setPiLoading(true);
        await authenticatePi();
        console.log('✅ Authentification réussie');
        
        setTimeout(() => syncWithSDK?.(), 1000);
        return;
      } catch (error) {
        console.error('❌ Erreur authentification:', error);
        toast.error("Échec de l'authentification Pi", { position: "bottom-right" });
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
      toast.error(`Erreur paiement: ${error.message}`, { position: "bottom-right" });
    } finally {
      setPiLoading(false);
    }
  };

  // Gérer les erreurs de paiement
  useEffect(() => {
    if (paymentError) setPaymentStatus('error');
  }, [paymentError]);

  // Gérer les paiements réussis
  useEffect(() => {
    if (currentPayment && currentPayment.status === 'completed') {
      console.log('🎉 Paiement réussi détecté, vidage du panier...');
      
      dispatch(CLEAR_CART());
      dispatch(INCREMENT_ORDER_STATS({ amount: cartTotalAmount }));
      
      const orderId = currentPayment.metadata?.orderId || generateOrderId();
      navigate(`/checkout-success?order=${orderId}&amount=${cartTotalAmount}&txid=${currentPayment.txid}`);
      
      toast.success("🎉 Paiement réussi ! Redirection...", {
        position: "bottom-right",
        autoClose: 3000
      });
    }
  }, [currentPayment, dispatch, cartTotalAmount, navigate]);

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
              <span className={sdkReallyLoaded ? styles.statusOk : styles.statusError}>
                SDK Pi: {sdkReallyLoaded ? '✅' : '❌'}
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

      {/* Debug Panel intégré */}
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
                  {currency} {(item.price * item.cartQuantity).toFixed(5)}
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
                <span>{currency} {cartTotalAmount.toFixed(5)}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span>Frais de livraison</span>
                <span className={styles.free}>Gratuits</span>
              </div>
              
              <div className={styles.summaryTotal}>
                <span>Total à payer</span>
                <span className={styles.totalAmount}>
                  {currency} {cartTotalAmount.toFixed(5)}
                </span>
              </div>
            </div>

            {/* Bouton paiement Pi */}
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
                  Payer {cartTotalAmount.toFixed(5)} π
                </>
              )}
            </button>
            {/* Bannière d'alerte pour paiement bloqué */}
            {pendingPaymentId && (
              <div className={styles.pendingPaymentAlert}>
                <div className={styles.alertContent}>
                  <FaExclamationTriangle />
                  <div className={styles.alertText}>
                    <strong>Paiement en attente détecté</strong>
                    <p>Un paiement précédent est bloqué. Annulez-le pour pouvoir effectuer un nouvel achat.</p>
                    <small>ID: {pendingPaymentId.substring(0, 15)}...</small>
                  </div>
                  <button
                    className={styles.cancelButton}
                    onClick={handleCancelPendingPayment}
                    disabled={cancellingPayment}
                  >
                    {cancellingPayment ? (
                      <>
                        <span className={styles.spinner}></span>
                        Annulation...
                      </>
                    ) : (
                      <>
                        <FaTimes />
                        Annuler le paiement bloqué
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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