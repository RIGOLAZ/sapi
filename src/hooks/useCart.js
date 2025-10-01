import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUser, 
  FaSignOutAlt, 
  FaTrashAlt, 
  FaPlus, 
  FaMinus, 
  FaTimes,
  FaShoppingBag,
  FaLock,
  FaMobileAlt,
  FaShoppingCart,
  FaExclamationTriangle
} from 'react-icons/fa';
import styles from './Cart.module.css';

// Hook useCart local pour remplacer le contexte manquant
const useCart = () => {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: 'Smartphone High-Tech',
      category: 'Électronique',
      price: 29.99,
      cartQuantity: 2,
      imageURL: 'https://via.placeholder.com/80x80/4A90E2/FFFFFF?text=Phone'
    },
    {
      id: 2,
      name: 'Casque Audio Premium',
      category: 'Audio',
      price: 45.50,
      cartQuantity: 1,
      imageURL: 'https://via.placeholder.com/80x80/50E3C2/FFFFFF?text=Audio'
    }
  ]);
  
  const cartTotalQuantity = cartItems.reduce((total, item) => total + item.cartQuantity, 0);
  const cartTotalAmount = cartItems.reduce((total, item) => total + (item.price * item.cartQuantity), 0);
  const currency = '€';

  const clearCart = () => setCartItems([]);
  
  const removeFromCart = (productToRemove) => {
    setCartItems(cartItems.filter(item => item.id !== productToRemove.id));
  };
  
  const increaseCart = (product) => {
    setCartItems(cartItems.map(item =>
      item.id === product.id
        ? { ...item, cartQuantity: item.cartQuantity + 1 }
        : item
    ));
  };
  
  const decreaseCart = (product) => {
    setCartItems(cartItems.map(item =>
      item.id === product.id && item.cartQuantity > 1
        ? { ...item, cartQuantity: item.cartQuantity - 1 }
        : item
    ));
  };

  const addDemoItem = () => {
    const newItem = {
      id: Date.now(),
      name: 'Produit Démo ' + (cartItems.length + 1),
      category: 'Démonstration',
      price: Math.round((Math.random() * 50 + 10) * 100) / 100,
      cartQuantity: 1,
      imageURL: `https://via.placeholder.com/80x80/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=Demo${cartItems.length + 1}`
    };
    setCartItems([...cartItems, newItem]);
  };

  return {
    cartItems,
    cartTotalAmount,
    cartTotalQuantity,
    clearCart,
    removeFromCart,
    increaseCart,
    decreaseCart,
    addDemoItem,
    currency
  };
};

// Composants modaux de remplacement
const PreparationModal = ({ amount, itemsCount }) => (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <div className={styles.modalHeader}>
        <h3>🔄 Préparation du paiement</h3>
      </div>
      <div className={styles.modalContent}>
        <div className={styles.loadingSpinner}></div>
        <p>Préparation de votre transaction de <strong>{amount} Pi</strong></p>
        <p>Articles: {itemsCount}</p>
        <small>Veuillez patienter...</small>
      </div>
    </div>
  </div>
);

const PiInterfaceModal = ({ amount, onClose }) => (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <div className={styles.modalHeader}>
        <h3>📱 Interface Pi Network</h3>
        <button onClick={onClose} className={styles.closeButton}>
          <FaTimes />
        </button>
      </div>
      <div className={styles.modalContent}>
        <div className={styles.piInterface}>
          <div className={styles.piLogo}>π</div>
          <h4>Confirmez votre paiement</h4>
          <p className={styles.paymentAmount}>{amount} Pi</p>
          <div className={styles.paymentDetails}>
            <p>Merci de confirmer la transaction dans l'interface Pi Network qui s'affiche.</p>
          </div>
          <div className={styles.simulationButtons}>
            <button 
              className={styles.simSuccess}
              onClick={() => {
                alert('✅ Paiement simulé avec succès !');
                onClose();
              }}
            >
              Simuler Paiement Réussi
            </button>
            <button 
              className={styles.simCancel}
              onClick={() => {
                alert('❌ Paiement annulé');
                onClose();
              }}
            >
              Simuler Annulation
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Cart = () => {
  // États du panier depuis le hook local
  const { 
    cartItems, 
    cartTotalAmount, 
    cartTotalQuantity, 
    clearCart, 
    removeFromCart, 
    increaseCart, 
    decreaseCart,
    addDemoItem,
    currency
  } = useCart();

  // États Pi SDK
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [piSDK, setPiSDK] = useState(null);

  // États du flux de paiement
  const [paymentFlow, setPaymentFlow] = useState({
    loading: false,
    showPreparationModal: false,
    showPiInterfaceModal: false
  });

  // Variables d'environnement Pi
  const isPiBrowser = window.pi && window.pi.isPiBrowser;
  const environment = window.pi?.env || 'sandbox';
  const platform = window.pi?.platform || 'unknown';

  // Scopes d'autorisation Pi
  const scopes = ['payments', 'username'];

  // Initialisation du SDK Pi
  useEffect(() => {
    const initializePiSDK = async () => {
      if (window.Pi) {
        try {
          console.log('🔄 Initialisation du SDK Pi...');
          await window.Pi.init({ version: "2.0" });
          setPiSDK(window.Pi);
          setIsInitialized(true);
          console.log('✅ SDK Pi initialisé avec succès');
        } catch (error) {
          console.error('❌ Erreur lors de l\'initialisation du SDK Pi:', error);
        }
      } else {
        console.warn('⚠️ SDK Pi non détecté - Mode démo activé');
        // Simuler l'initialisation pour la démo
        setTimeout(() => setIsInitialized(true), 1000);
      }
    };

    initializePiSDK();
  }, []);

  // Gestionnaire d'authentification Pi
  const handleAuthentication = async () => {
    if (!piSDK) {
      console.log('🔐 Mode démo - Simulation d\'authentification');
      // Simulation pour la démo
      setAuthLoading(true);
      setTimeout(() => {
        setUser({ username: 'utilisateur_demo' });
        setIsAuthenticated(true);
        setAuthLoading(false);
      }, 1500);
      return;
    }

    setAuthLoading(true);
    try {
      // Callback pour les paiements incomplets
      const onIncompletePaymentFound = (payment) => {
        console.log('💰 Paiement incomplet détecté:', payment);
      };

      // Authentification
      const authResult = await piSDK.authenticate(scopes, onIncompletePaymentFound);
      
      console.log('✅ Authentification réussie:', authResult);
      setUser(authResult.user);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error);
      alert('Échec de l\'authentification: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Gestionnaire de déconnexion
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    console.log('👤 Utilisateur déconnecté');
  };

  // Fonction principale de paiement
  const startPiPaymentFlow = async () => {
    console.log('🔵 Début du processus de paiement Pi');
    
    // Vérifications préalables
    if (!isPiBrowser) {
      alert('Veuillez ouvrir cette page dans Pi Browser pour effectuer le paiement');
      return;
    }
    
    if (cartItems.length === 0) {
      alert('Votre panier est vide');
      return;
    }
    
    if (!isAuthenticated) {
      alert('Veuillez vous authentifier avec Pi Network');
      return;
    }

    if (!piSDK) {
      console.log('💰 Mode démo - Simulation de paiement');
      // Simulation du processus de paiement
      setPaymentFlow({
        loading: true,
        showPreparationModal: true,
        showPiInterfaceModal: false
      });

      // Simuler le traitement
      setTimeout(() => {
        setPaymentFlow({
          loading: false,
          showPreparationModal: false,
          showPiInterfaceModal: true
        });
      }, 2000);
      return;
    }

    try {
      // Début du processus - afficher le modal de préparation
      setPaymentFlow({
        loading: true,
        showPreparationModal: true,
        showPiInterfaceModal: false
      });

      // Préparer les données de paiement
      const paymentData = {
        amount: cartTotalAmount,
        memo: `Achat de ${cartTotalQuantity} article(s) - E-Commerce Store`,
        metadata: {
          products: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.cartQuantity,
            price: item.price,
            total: (item.price * item.cartQuantity).toFixed(2)
          })),
          totalItems: cartTotalQuantity,
          orderId: `ORDER-${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📦 Données de paiement:', paymentData);

      // Créer le paiement avec le SDK Pi
      const payment = await piSDK.createPayment(paymentData);
      
      console.log('✅ Paiement créé:', payment);

      // Passer à l'interface de confirmation
      setPaymentFlow({
        loading: false,
        showPreparationModal: false,
        showPiInterfaceModal: true
      });

    } catch (error) {
      console.error('❌ Erreur lors du paiement:', error);
      
      setPaymentFlow({
        loading: false,
        showPreparationModal: false,
        showPiInterfaceModal: false
      });

      if (error.message?.includes('user cancelled') || error.message?.includes('canceled')) {
        alert('Paiement annulé par l\'utilisateur');
      } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
        alert('Solde Pi insuffisant pour effectuer cette transaction');
      } else {
        alert('Erreur lors du paiement: ' + error.message);
      }
    }
  };

  return (
    <div className={styles.cartContainer}>
      {/* EN-TÊTE PRINCIPAL */}
      <div className={styles.cartHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h1><FaShoppingCart /> Panier d'achat</h1>
            <p className={styles.itemsCount}>
              {cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''} dans votre panier
            </p>
          </div>
          
          {/* STATUT D'AUTHENTIFICATION */}
          {isAuthenticated && user ? (
            <div className={styles.authStatus}>
              <div className={styles.userInfo}>
                <FaUser className={styles.userIcon} />
                <span className={styles.username}>Connecté: {user.username}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className={styles.logoutBtn}
                title="Déconnexion"
              >
                <FaSignOutAlt />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAuthentication}
              disabled={authLoading}
              className={`${styles.authButton} ${authLoading ? styles.loading : ''}`}
            >
              {authLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Authentification...
                </>
              ) : (
                <>
                  <span className={styles.piSymbol}>π</span>
                  Se connecter avec Pi
                </>
              )}
            </button>
          )}
        </div>

        {/* INDICATEURS ENVIRONNEMENT */}
        <div className={styles.environmentIndicator}>
          <div className={styles.envItem}>
            <span className={styles.envLabel}>Environnement:</span>
            <strong className={`${styles.envValue} ${environment === 'sandbox' ? styles.sandbox : styles.production}`}>
              {environment}
            </strong>
          </div>
          <div className={styles.envItem}>
            <span className={styles.envLabel}>Plateforme:</span>
            <strong className={styles.envValue}>{platform}</strong>
          </div>
          <div className={styles.envItem}>
            <span className={styles.envLabel}>SDK Pi:</span>
            <strong className={styles.envValue}>
              {isInitialized ? '✅ Initialisé' : '🔄 Chargement...'}
            </strong>
          </div>
          {!window.Pi && (
            <div className={styles.envItem}>
              <span className={styles.envLabel}>Mode:</span>
              <strong className={styles.demoMode}>🚀 Démo</strong>
            </div>
          )}
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className={styles.cartContent}>
        {/* SECTION ARTICLES DU PANIER */}
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h2>📋 Produits sélectionnés</h2>
            <button 
              className={styles.clearButton} 
              onClick={clearCart}
              disabled={cartItems.length === 0}
              title="Vider tout le panier"
            >
              <FaTrashAlt />
              Vider le panier
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <div className={styles.emptyCartIcon}>🛒</div>
              <h3>Votre panier est vide</h3>
              <p>Ajoutez des produits passionnants à votre panier !</p>
              <Link to="/" className={styles.shopNowLink}>
                <FaShoppingBag />
                Découvrir nos produits
              </Link>
              
              {/* Section démo pour tester */}
              <div className={styles.demoSection}>
                <h4>🎯 Zone de test</h4>
                <p>Pour tester le paiement, ajoutez d'abord des articles au panier.</p>
                <div className={styles.demoButtons}>
                  <button 
                    onClick={addDemoItem}
                    className={styles.demoBtn}
                  >
                    + Ajouter Article Test
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {cartItems.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  {/* Image du produit */}
                  <div className={styles.itemImage}>
                    <img src={item.imageURL} alt={item.name} />
                  </div>
                  
                  {/* Informations du produit */}
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    <p className={styles.itemCategory}>{item.category}</p>
                    <p className={styles.itemPrice}>
                      {currency} {item.price}
                    </p>
                  </div>

                  {/* Contrôles de quantité */}
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

                  {/* Total pour l'article */}
                  <div className={styles.itemTotal}>
                    {currency} {(item.price * item.cartQuantity).toFixed(2)}
                  </div>

                  {/* Bouton de suppression */}
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
          )}
        </div>

        {/* SECTION RÉSUMÉ ET PAIEMENT */}
        <div className={styles.cartSummary}>
          <div className={styles.summaryCard}>
            <h2>💰 Résumé de la commande</h2>
            
            <div className={styles.summaryDetails}>
              <div className={styles.summaryRow}>
                <span>Sous-total ({cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''})</span>
                <span>{currency} {cartTotalAmount.toFixed(2)}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span>Frais de livraison</span>
                <span className={styles.free}>🎁 Gratuits</span>
              </div>
              
              <div className={styles.summaryTotal}>
                <span>Total à payer</span>
                <span className={styles.totalAmount}>
                  {currency} {cartTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* BOUTON DE PAIEMENT PRINCIPAL */}
            <button
              className={`
                ${styles.checkoutButton} 
                ${cartItems.length === 0 || !isAuthenticated ? styles.disabled : ''}
                ${paymentFlow.loading ? styles.loading : ''}
              `}
              onClick={startPiPaymentFlow}
              disabled={cartItems.length === 0 || !isAuthenticated || paymentFlow.loading}
            >
              {paymentFlow.loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <span className={styles.piSymbol}>π</span>
                  Payer {cartTotalAmount.toFixed(2)} Pi
                  {environment && (
                    <span className={styles.envIndicator}>[{environment.toUpperCase()}]</span>
                  )}
                </>
              )}
            </button>

            {/* MESSAGES INFORMATIFS */}
            <div className={styles.infoMessages}>
              {!isInitialized && (
                <div className={styles.infoMessage}>
                  <span className={styles.infoIcon}>🔄</span>
                  <div className={styles.infoContent}>
                    <strong>Initialisation du SDK Pi</strong>
                    <p>Chargement en cours...</p>
                  </div>
                </div>
              )}

              {isInitialized && !isAuthenticated && (
                <div className={styles.infoMessage}>
                  <span className={styles.infoIcon}>🔐</span>
                  <div className={styles.infoContent}>
                    <strong>Authentification requise</strong>
                    <p>Connectez-vous avec Pi pour procéder au paiement</p>
                  </div>
                </div>
              )}

              {isAuthenticated && !isPiBrowser && (
                <div className={styles.infoMessage}>
                  <span className={styles.infoIcon}><FaMobileAlt /></span>
                  <div className={styles.infoContent}>
                    <strong>Pi Browser requis</strong>
                    <p>Ouvrez cette page dans l'application Pi Browser pour payer avec Pi</p>
                    <small>Disponible sur le Pi Network</small>
                  </div>
                </div>
              )}

              {isAuthenticated && isPiBrowser && cartItems.length === 0 && (
                <div className={styles.infoMessage}>
                  <span className={styles.infoIcon}><FaShoppingCart /></span>
                  <div className={styles.infoContent}>
                    <strong>Panier vide</strong>
                    <p>Ajoutez des articles avant de procéder au paiement</p>
                  </div>
                </div>
              )}

              {!window.Pi && (
                <div className={styles.infoMessage}>
                  <span className={styles.infoIcon}><FaExclamationTriangle /></span>
                  <div className={styles.infoContent}>
                    <strong>Mode démonstration</strong>
                    <p>Le SDK Pi n'est pas détecté. Fonctionnement en mode simulation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* NOTE DE SÉCURITÉ */}
            <div className={styles.securityNote}>
              <div className={styles.securityHeader}>
                <span className={styles.securityIcon}><FaLock /></span>
                <strong>Paiement sécurisé Pi Network</strong>
              </div>
              <p>Transactions cryptographiques décentralisées et sécurisées</p>
              {environment === 'sandbox' && (
                <div className={styles.sandboxNote}>
                  <small>⚠️ Mode test activé - Utilisez uniquement des Pi de test</small>
                </div>
              )}
            </div>
          </div>

          {/* LIEN POUR CONTINUER LES ACHATS */}
          <Link to="/" className={styles.continueLink}>
            <FaShoppingBag />
            Continuer mes achats
          </Link>
        </div>
      </div>

      {/* MODALS DE PAIEMENT */}
      {paymentFlow.showPreparationModal && (
        <PreparationModal 
          amount={cartTotalAmount}
          itemsCount={cartTotalQuantity}
        />
      )}
      
      {paymentFlow.showPiInterfaceModal && (
        <PiInterfaceModal 
          amount={cartTotalAmount}
          onClose={() => setPaymentFlow(prev => ({ ...prev, showPiInterfaceModal: false }))}
        />
      )}
    </div>
  );
};

export default Cart;