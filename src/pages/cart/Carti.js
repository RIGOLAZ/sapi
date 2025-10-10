Voici mon code Cart.js
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';
import { currency } from "..";
import { usePiDetection } from '../../hooks/usePiDetection.js';
import { usePiPayment } from "../../hooks/usePiPayment.js"; // ← AJOUTEZ CET IMPORT
import { usePiAuth } from "../../hooks/usePiAuth.js"; // ← AJOUTEZ CET IMPORT
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
  FaUserCheck,
  FaSync
} from "react-icons/fa";
import { Link } from "react-router-dom";

// Configuration Pi Network
const PI_CONFIG = {
  scopes: ['payments', 'username'],
  version: "2.0",
  sandbox: process.env.NODE_ENV !== 'production'
};

// REMPLACEZ par votre vrai Project ID Firebase
const FIREBASE_PROJECT_ID = 'sapi-460615d940fecab6'; // Votre slug Pi App

// Composant de débogage Pi Browser
const PiBrowserDebug = () => {
  // Vérification DIRECTE du SDK, pas via le hook
  const sdkReallyLoaded = typeof window.Pi !== 'undefined';
  const createPaymentAvailable = sdkReallyLoaded && typeof window.Pi.createPayment === 'function';
  const authenticateAvailable = sdkReallyLoaded && typeof window.Pi.authenticate === 'function';
  
  // Vérification de l'environnement
  const hostname = window.location.hostname;
  const isProduction = hostname === 'sapi.etralis.com';
  
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
      </div>
      
      <div className={styles.debugInfo}>
        <strong>🎯 État réel : OPÉRATIONNEL</strong>
        <p>Le SDK Pi est correctement chargé et fonctionnel sur localhost</p>
      </div>
    </div>
  );
};

const Cart = () => {
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
    checkRealAuthState,
    syncWithSDK
  } = usePiAuth();

  const { isPiBrowser, isPiLoaded } = usePiDetection();
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  // États Pi Network
  const [piAuthenticated, setPiAuthenticated] = useState(false);
  const [piUser, setPiUser] = useState(null);
  const [piSDKReady, setPiSDKReady] = useState(false);
  const [piLoading, setPiLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [currentPayment, setCurrentPayment] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [callbacksReady, setCallbacksReady] = useState(false);

  // Approbation côté serveur
  const handleServerApproval = async (paymentId, orderId) => {
    try {
      console.log('📡 Envoi approbation au serveur:', { paymentId, orderId });
      
      const response = await fetch('/api/approve-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ 
          paymentId, 
          orderId,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Paiement approuvé côté serveur:', result);
      
    } catch (error) {
      console.error('❌ Erreur approbation serveur:', error);
    }
  };

  // Complétion de transaction
  const handleServerCompletion = async (paymentId, txid, orderId) => {
    try {
      console.log('📡 Envoi complétion au serveur:', { paymentId, txid, orderId });
      
      const response = await fetch('/api/complete-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ 
          paymentId, 
          txid, 
          orderId,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la complétion: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Transaction complétée côté serveur:', result);
      
    } catch (error) {
      console.error('❌ Erreur complétion serveur:', error);
    }
  };

  // Gestion annulation
  const handlePaymentCancel = (paymentId, orderId) => {
    console.log(`🛑 Paiement ${paymentId} annulé pour la commande ${orderId}`);
    setPaymentStatus('cancelled');
    toast.info('Paiement annulé', { position: "bottom-right" });
  };

  // Gestion erreurs
  const handlePaymentError = (error, paymentId, orderId) => {
    console.error(`💥 Erreur avec le paiement ${paymentId}:`, {
      error: error.message,
      paymentId,
      orderId
    });
    setPaymentStatus('error');
    toast.error('Erreur de paiement', { position: "bottom-right" });
  };

  // Fonction utilitaire pour obtenir le token d'authentification
  const getAuthToken = async () => {
    return localStorage.getItem('auth_token') || '';
  };

  // Initialisation du SDK Pi
  useEffect(() => {
    initializePiSDK();
  }, []);

  // Fonction d'initialisation du SDK Pi
  const initializePiSDK = () => {
    if (window.Pi) {
      console.log('🔧 Initialisation SDK Pi...');
      
      try {
        window.Pi.init(PI_CONFIG);
        setPiSDKReady(true);
        console.log('✅ SDK Pi initialisé');
        
        // Configurer les callbacks IMMÉDIATEMENT
        setupGlobalPiCallbacks();
        
        // Authentification automatique
        authenticatePiUser();
        
      } catch (error) {
        console.error('❌ Erreur initialisation SDK Pi:', error);
      }
    } else {
      console.log('📥 Chargement SDK Pi...');
      loadPiSDK();
    }
  };

  // Chargement du SDK Pi
  const loadPiSDK = () => {
    const script = document.createElement('script');
    script.src = 'https://sdk.minepi.com/pi-sdk.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ SDK Pi chargé');
      setTimeout(() => {
        if (window.Pi) {
          initializePiSDK();
        }
      }, 100);
    };
    
    script.onerror = () => {
      console.error('❌ Erreur chargement SDK Pi');
    };
    
    document.head.appendChild(script);
  };

  // Configuration des callbacks GLOBAUX - DOIT ÊTRE APPELÉE AU CHARGEMENT
  const setupGlobalPiCallbacks = () => {
    console.log('🔧 Configuration des callbacks globaux Pi...');

    // CALLBACK 1: Appelé quand le paiement est prêt pour l'approbation serveur
    window.onReadyForServerApproval = async (paymentId) => {
      console.log('📝 Approval demandée pour:', paymentId);
      setPaymentStatus('waiting_approval');
      
      try {
        // SIMULATION pour développement
        console.log('✅ Simulation approbation pour:', paymentId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Approbation simulée avec succès');
        
      } catch (error) {
        console.error('❌ Erreur approbation:', error);
        toast.error('Erreur approbation paiement', { position: "bottom-right" });
      }
    };

    // CALLBACK 2: Appelé quand le paiement est prêt pour la complétion
    window.onReadyForServerCompletion = async (paymentId, txid) => {
      console.log('✅ Completion demandée pour:', paymentId, txid);
      setPaymentStatus('completing');
      
      try {
        // SIMULATION pour développement
        console.log('✅ Simulation completion pour:', paymentId, txid);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setPaymentStatus('completed');
        toast.success('🎉 Paiement réussi ! Commande confirmée.', {
          position: "bottom-right",
          autoClose: 5000
        });
        
        // Vider le panier après succès
        setTimeout(() => {
          dispatch(CLEAR_CART());
          setPaymentStatus('idle');
          setCurrentPayment(null);
          setCurrentOrder(null);
        }, 3000);
        
      } catch (error) {
        console.error('❌ Erreur completion:', error);
        toast.error('Erreur finalisation paiement', { position: "bottom-right" });
        setPaymentStatus('error');
      }
    };

    // CALLBACK 3: Appelé quand le paiement est annulé
    window.onCancel = (paymentId) => {
      console.log('❌ Paiement annulé:', paymentId);
      setPaymentStatus('cancelled');
      setCurrentPayment(null);
      
      toast.info('Paiement annulé', {
        position: "bottom-right"
      });
      
      setTimeout(() => setPaymentStatus('idle'), 3000);
    };

    // CALLBACK 4: Appelé en cas d'erreur
    window.onError = (error, payment) => {
      console.error('❌ Erreur paiement Pi:', error, payment);
      setPaymentStatus('error');
      
      toast.error('Erreur de paiement Pi Network', {
        position: "bottom-right"
      });
    };

    setCallbacksReady(true);
    console.log('✅ Tous les callbacks globaux configurés');
  };

  // Authentification Pi avec scopes
  const authenticatePiUser = async () => {
    if (!window.Pi) return;

    try {
      console.log('🔐 Début authentification Pi...');
      setPiLoading(true);
      
      // Gestion des paiements incomplets
      const onIncompletePaymentFound = (payment) => {
        console.log('⚠️ Paiement incomplet trouvé:', payment);
      };

      // Authentification avec scopes
      const authResult = await window.Pi.authenticate(
        PI_CONFIG.scopes, 
        onIncompletePaymentFound
      );
      
      if (authResult && authResult.user) {
        console.log('✅ Authentification Pi réussie:', authResult.user);
        setPiAuthenticated(true);
        setPiUser(authResult.user);
        
        toast.success(`Connecté en tant que ${authResult.user.username}`, {
          position: "bottom-right",
          autoClose: 3000
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur authentification Pi:', error);
      
      if (!error.message?.includes('user cancelled')) {
        toast.error('Erreur authentification Pi Network', {
          position: "bottom-right"
        });
      }
    } finally {
      setPiLoading(false);
    }
  };

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

  // Paiement Pi Network
  // Paiement Pi Network - VERSION CORRIGÉE
// Paiement Pi Network - VERSION ULTRA-SÉCURISÉE
// Paiement Pi Network - VERSION CORRIGÉE
const handlePiPayment = async () => {
  console.log('🎯 DÉBUT PAIEMENT - VÉRIFICATION SÉCURISÉE');
  
  // VÉRIFICATION de l'authentification AVEC LES HOOKS
  if (!isAuthenticated || !piUser) {
    console.log('🔐 Authentification requise');
    
    try {
      setPiLoading(true);
      await authenticatePi(); // ← MAINTENANT DÉFINI
      console.log('✅ Authentification réussie');
      
      // Synchronisation forcée
      setTimeout(() => {
        syncWithSDK?.();
      }, 500);
      
      return; // Le re-render relancera le paiement
    } catch (error) {
      console.error('❌ Erreur authentification:', error);
      toast.error("Échec de l'authentification Pi");
      return;
    } finally {
      setPiLoading(false);
    }
  }

  // VÉRIFICATION SUPPLÉMENTAIRE avec checkRealAuthState si disponible
  let isValidAuthentication = isAuthenticated;
  if (checkRealAuthState) {
    const authState = checkRealAuthState();
    isValidAuthentication = authState.isValidAuthentication;
    console.log('🔐 Vérification supplémentaire:', authState);
  }

  if (!isValidAuthentication) {
    toast.error("Problème d'authentification Pi", {
      position: "bottom-right"
    });
    return;
  }

  setPiLoading(true);
  setPaymentStatus('creating_order');

  try {
    const orderId = generateOrderId();
    console.log('📦 Création commande:', orderId);
    
    const orderData = {
      orderId,
      items: [...cartItems],
      totalAmount: cartTotalAmount,
      totalQuantity: cartTotalQuantity,
      status: 'pending_payment',
      paymentMethod: 'pi_network',
      createdAt: new Date().toISOString(),
      piUser: piUser.username
    };
    
    saveOrderToLocalStorage(orderData);

    // DONNÉES DE PAIEMENT
    const paymentData = {
      amount: cartTotalAmount,
      memo: `SAPI - ${orderId}`,
      metadata: {
        orderId: orderId,
        userId: piUser.uid,
        username: piUser.username,
        totalAmount: cartTotalAmount,
        timestamp: new Date().toISOString()
      }
    };

    // CALLBACKS POUR LE PAIEMENT
    const paymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        console.log('✅ Approval reçue:', paymentId);
        setPaymentStatus('waiting_approval');
        
        // Simulation en développement
        if (window.location.hostname === 'localhost') {
          console.log('🎭 Sandbox: Processus continué');
        }
      },
      
      onReadyForServerCompletion: (paymentId, txid) => {
        console.log('🎉 Paiement complété:', paymentId, txid);
        setPaymentStatus('completed');
        
        toast.success('✅ Paiement réussi !', {
          position: "bottom-right",
          autoClose: 5000
        });
        
        // Vider le panier
        setTimeout(() => {
          dispatch(CLEAR_CART());
          setPaymentStatus('idle');
        }, 3000);
      },
      
      onCancel: (paymentId) => {
        console.log('❌ Paiement annulé:', paymentId);
        setPaymentStatus('cancelled');
        toast.info('Paiement annulé', { position: "bottom-right" });
        
        setTimeout(() => setPaymentStatus('idle'), 3000);
      },
      
      onError: (error, payment) => {
        console.error('💥 Erreur paiement:', error);
        setPaymentStatus('error');
        toast.error('Erreur de paiement', { position: "bottom-right" });
      }
    };

    setPaymentStatus('creating_payment');
    
    console.log('🚀 Création paiement pour:', piUser.username);
    
    // CRÉATION DU PAIEMENT
    await initiatePayment(paymentData); // ← Utilisez initiatePayment du hook
    
    console.log('✅ Paiement initié avec succès');
    
  } catch (error) {
    console.error('❌ ERREUR PAIEMENT:', error);
    setPaymentStatus('error');
    toast.error(`Erreur: ${error.message}`, { position: "bottom-right" });
  } finally {
    setPiLoading(false);
  }
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
      console.log('💾 Commande sauvegardée localement:', orderData.orderId);
    } catch (error) {
      console.error('❌ Erreur sauvegarde commande:', error);
    }
  };

  // Réauthentification
  const reauthenticatePi = async () => {
    setPiLoading(true);
    try {
      await authenticatePiUser();
    } catch (error) {
      console.error('❌ Erreur réauthentification:', error);
    } finally {
      setPiLoading(false);
    }
  };

  // Recharger le SDK
  const reloadPiSDK = () => {
    setPiSDKReady(false);
    setPiAuthenticated(false);
    setPiUser(null);
    setCurrentPayment(null);
    setCurrentOrder(null);
    setCallbacksReady(false);
    
    // Supprimer l'ancien script
    const script = document.querySelector('script[src="https://sdk.minepi.com/pi-sdk.js"]');
    if (script) script.remove();
    
    // Nettoyer les callbacks globaux
    delete window.onReadyForServerApproval;
    delete window.onReadyForServerCompletion;
    delete window.onCancel;
    delete window.onError;
    
    if (window.Pi) {
      delete window.Pi;
    }
    
    // Recharger après un délai
    setTimeout(() => {
      initializePiSDK();
    }, 1000);
    
    toast.info('Rechargement Pi SDK...', {
      position: "bottom-right"
    });
  };

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
        
        {/* Statut Pi */}
        <div className={styles.piStatusHeader}>
          <div className={styles.piStatusInfo}>
            <div className={`${styles.statusIndicator} ${piSDKReady ? styles.ready : styles.loading}`}>
              {piSDKReady ? '✅ SDK Pi Prêt' : '🔄 SDK Pi Chargement...'}
            </div>
            {piAuthenticated ? (
              <div className={styles.userInfo}>
                <FaUserCheck />
                <span>Connecté: {piUser?.username}</span>
              </div>
            ) : (
              <div className={styles.authInfo}>
                <button 
                  className={styles.authButton}
                  onClick={reauthenticatePi}
                  disabled={piLoading}
                >
                  {piLoading ? '🔐 Connexion...' : '🔐 Se connecter'}
                </button>
              </div>
            )}
          </div>
          
          {/* Actions Pi */}
          <div className={styles.piActions}>
            <button 
              className={styles.reloadButton}
              onClick={reloadPiSDK}
              title="Recharger Pi SDK"
            >
              <FaSync />
            </button>
          </div>
        </div>
      </div>

      {/* Debug Firebase (développement seulement) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugSection}>
          <h4>🔧 Debug Firebase:</h4>
          <div className={styles.debugGrid}>
            <div>Commande: {currentOrder?.id || 'Aucune'}</div>
            <div>Paiement: {currentPayment?.identifier || 'Aucun'}</div>
            <div>Statut: {paymentStatus}</div>
            <div>Utilisateur: {piUser?.username || 'Non connecté'}</div>
          </div>
        </div>
      )}

      {/* Debug Panel (développement seulement) */}
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

            {/* Bouton paiement Pi */}
            <button
              className={`${styles.checkoutButton} ${
                !piAuthenticated || piLoading ? styles.disabled : ''
              } ${paymentStatus === 'completed' ? styles.success : ''} ${
                paymentStatus === 'error' ? styles.error : ''
              }`}
              onClick={handlePiPayment}
              disabled={!piAuthenticated || piLoading}
            >
              {piLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  {paymentStatus === 'creating_order' && 'Création commande...'}
                  {paymentStatus === 'creating_payment' && 'Création paiement...'}
                  {paymentStatus === 'waiting_approval' && 'Approbation...'}
                  {paymentStatus === 'completing' && 'Finalisation...'}
                  {!paymentStatus.includes('_') && 'Traitement...'}
                </>
              ) : paymentStatus === 'completed' ? (
                <>
                  <FaCheck />
                  Paiement réussi !
                </>
              ) : paymentStatus === 'error' ? (
                <>
                  <FaExclamationTriangle />
                  Réessayer le paiement
                </>
              ) : !piAuthenticated ? (
                <>
                  <FaUserCheck />
                  Authentification requise
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
              {!piSDKReady && (
                <div className={`${styles.infoMessage} ${styles.warning}`}>
                  <FaSync />
                  <div>
                    <strong>SDK Pi en chargement</strong>
                    <p>Initialisation de Pi Network en cours...</p>
                  </div>
                </div>
              )}

              {piSDKReady && !piAuthenticated && (
                <div className={`${styles.infoMessage} ${styles.info}`}>
                  <FaUserCheck />
                  <div>
                    <strong>Authentification requise</strong>
                    <p>Connectez-vous avec Pi Network pour payer</p>
                  </div>
                </div>
              )}

              {(piLoading || paymentStatus.includes('creating') || paymentStatus.includes('waiting')) && (
                <div className={`${styles.infoMessage} ${styles.processing}`}>
                  <div className={styles.processingSpinner}></div>
                  <div>
                    <strong>Paiement en cours</strong>
                    <p>Ne quittez pas cette page</p>
                  </div>
                </div>
              )}

              {paymentStatus === 'cancelled' && (
                <div className={`${styles.infoMessage} ${styles.warning}`}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Paiement annulé</strong>
                    <p>Le paiement a été annulé</p>
                  </div>
                </div>
              )}

              {paymentStatus === 'error' && (
                <div className={`${styles.infoMessage} ${styles.error}`}>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Erreur de paiement</strong>
                    <p>Une erreur est survenue lors du paiement</p>
                  </div>
                </div>
              )}

              {currentOrder && paymentStatus !== 'completed' && (
                <div className={`${styles.infoMessage} ${styles.info}`}>
                  <FaCheck />
                  <div>
                    <strong>Commande créée</strong>
                    <p>ID: {currentOrder.id}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions de récupération en cas d'erreur */}
            {(paymentStatus === 'error' || paymentStatus === 'cancelled') && (
              <div className={styles.recoveryActions}>
                <button 
                  className={styles.retryButton}
                  onClick={() => {
                    setPaymentStatus('idle');
                    setCurrentPayment(null);
                  }}
                >
                  Réinitialiser
                </button>
                <button 
                  className={styles.reloadButton}
                  onClick={reloadPiSDK}
                >
                  Recharger SDK
                </button>
              </div>
            )}

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

Rempli-moi celui qui suit en prenant les informations sur mon code ci-dessus:
