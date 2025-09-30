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
import { FaTrashAlt, FaPlus, FaMinus, FaShoppingBag, FaTimes, FaExternalLinkAlt, FaLock, FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import usePiPayment from "../../hooks/usePiPayment";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  // États pour gérer le flux de paiement
  const [paymentFlow, setPaymentFlow] = useState({
    showPreModal: false,      // Votre modal de préparation
    piInterfaceOpen: false,   // Interface Pi ouverte
    processing: false,        // En traitement
    completed: false          // Terminé
  });
  
  const [currentOrder, setCurrentOrder] = useState(null);
  const [piStatus, setPiStatus] = useState('');
  const [permissionError, setPermissionError] = useState(false);

  const { 
    isPiBrowser, 
    createPayment, 
    loading: piLoading, 
    setupPiCallbacks,
    hasPaymentsScope 
  } = usePiPayment();

  /* --------------------------------------------------------------
     GESTION DU PANIER
  -------------------------------------------------------------- */
  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
    toast.success(`${cart.name} ajouté au panier`, { 
      position: "bottom-right",
      icon: "🛒"
    });
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
    toast.info(`${cart.name} quantité diminuée`, { 
      position: "bottom-right" 
    });
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
    toast.error(`${cart.name} retiré du panier`, { 
      position: "bottom-right" 
    });
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
    toast.info('Panier vidé', { 
      position: "bottom-right" 
    });
  };

  /* --------------------------------------------------------------
     FLUX DE PAIEMENT RÉEL
  -------------------------------------------------------------- */
  const startPiPaymentFlow = () => {
    if (!isPiBrowser) {
      toast.info(
        <div>
          <strong>📱 Pi Browser requis</strong>
          <br />
          Ouvrez cette page dans l'application Pi Browser
        </div>,
        { 
          position: "bottom-right", 
          autoClose: 6000,
          closeButton: true
        }
      );
      return;
    }

    if (cartItems.length === 0) {
      toast.warning("🛒 Votre panier est vide", { 
        position: "bottom-right" 
      });
      return;
    }

    // Étape 1: Ouvrir VOTRE modal de préparation
    setPaymentFlow(prev => ({ ...prev, showPreModal: true }));
    setPiStatus('Préparation du paiement...');
    setPermissionError(false);
  };

  const launchPiPayment = async () => {
    try {
      const orderId = `SAPI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const amount = parseFloat(cartTotalAmount.toFixed(2));
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Montant de paiement invalide");
      }

      // Préparer les données de commande
      const orderData = {
        orderId,
        amount,
        items: cartItems,
        timestamp: new Date().toISOString()
      };
      
      setCurrentOrder(orderData);

      // Préparer les métadonnées pour Pi
      const metadata = {
        orderId: orderId,
        userId: localStorage.getItem('userId') || 'guest',
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
          imageURL: item.imageURL
        })),
        totalItems: cartTotalQuantity,
        totalAmount: amount,
        store: 'SAPI Store',
        environment: process.env.NODE_ENV
      };

      const memo = `SAPI Store - ${cartTotalQuantity} article(s) - ${orderId}`;

      console.log("🎯 Lancement paiement Pi:", { amount, memo, metadata });

      // Configuration des callbacks Pi
      const callbacks = setupPiCallbacks(
        // onApproval - Appelé quand l'utilisateur approuve le paiement
        async (paymentId) => {
          console.log("✅ Paiement approuvé par utilisateur:", paymentId);
          setPiStatus('Validation du paiement côté serveur...');
          
          try {
            // Simuler l'appel à votre backend
            const approvalResult = await approvePaymentOnServer(paymentId, orderId, amount);
            
            if (!approvalResult.success) {
              throw new Error("Échec de l'approbation serveur");
            }
            
            console.log("✅ Paiement validé par le serveur");
            
          } catch (error) {
            console.error("❌ Erreur lors de l'approbation:", error);
            throw error;
          }
        },
        
        // onCompletion - Appelé quand la transaction est prête
        async (paymentId, txid) => {
          console.log("✅ Transaction complétée:", paymentId, txid);
          setPiStatus('Finalisation de la commande...');
          
          try {
            // Simuler l'appel à votre backend
            const completionResult = await completePaymentOnServer(paymentId, txid, orderId);
            
            if (!completionResult.success) {
              throw new Error("Échec de la complétion serveur");
            }
            
            // Compléter le paiement côté Pi
            if (window.Pi && typeof window.Pi.completePayment === 'function') {
              await window.Pi.completePayment(paymentId, txid);
            }
            
            // Gérer le succès
            handlePaymentSuccess(orderId, paymentId, txid);
            
          } catch (error) {
            console.error("❌ Erreur lors de la complétion:", error);
            throw error;
          }
        },
        
        // onCancel - Appelé quand l'utilisateur annule
        (paymentId) => {
          console.log("❌ Paiement annulé dans l'interface Pi:", paymentId);
          setPiStatus('Paiement annulé');
          toast.info(
            <div>
              <strong>Paiement annulé</strong>
              <br />
              Vous pouvez réessayer à tout moment
            </div>,
            { 
              position: "bottom-right",
              autoClose: 4000
            }
          );
          resetPaymentFlow();
        },
        
        // onError - Appelé en cas d'erreur
        (error) => {
          console.error("❌ Erreur interface Pi:", error);
          setPiStatus('Erreur lors du paiement');
          handlePaymentError(error);
        }
      );

      // Si les callbacks ne sont pas disponibles, on utilise le mode simple
      if (!callbacks.hasCallbacks) {
        console.log("ℹ️ Mode simple activé - pas de callbacks disponibles");
      }

      // Étape 2: Fermer VOTRE modal et ouvrir l'interface Pi
      setPaymentFlow(prev => ({ 
        ...prev, 
        showPreModal: false, 
        piInterfaceOpen: true 
      }));
      
      setPiStatus('Ouverture de l\'interface Pi Network...');
      setPermissionError(false);

      // Étape 3: Lancer le paiement - OUVRE L'INTERFACE OFFICIELLE PI
      const payment = await createPayment(amount, memo, metadata);
      
      console.log("🔗 Interface Pi ouverte avec succès:", payment);
      setPiStatus('Interface Pi Network ouverte - Confirmez le paiement');

    } catch (error) {
      console.error('❌ Erreur lors du lancement du paiement:', error);
      
      // Gestion spécifique des erreurs de permission
      if (error.message.includes('payments scope') || error.message.includes('Permission')) {
        setPermissionError(true);
        setPiStatus('Permission de paiement requise');
        toast.error(
          <div>
            <strong>🔒 Permission requise</strong>
            <br />
            Autorisez les paiements dans Pi Browser
          </div>,
          { 
            position: "bottom-right", 
            autoClose: 8000,
            closeButton: true
          }
        );
      } else {
        handlePaymentError(error);
      }
    }
  };

  /* --------------------------------------------------------------
     GESTION DES RÉSULTATS
  -------------------------------------------------------------- */
  const handlePaymentSuccess = (orderId, paymentId, txid) => {
    setPaymentFlow(prev => ({ ...prev, processing: false, completed: true }));
    setPiStatus('🎉 Paiement réussi !');
    
    // Sauvegarder la commande localement
    const orderData = {
      orderId,
      paymentId,
      txid,
      items: cartItems,
      total: cartTotalAmount,
      status: 'completed',
      date: new Date().toISOString(),
      paymentMethod: 'Pi Network'
    };

    localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
    localStorage.setItem('last_successful_order', JSON.stringify(orderData));
    
    toast.success(
      <div>
        <strong>✅ Paiement réussi !</strong>
        <br />
        Commande: {orderId}
      </div>,
      { 
        position: "bottom-right", 
        autoClose: 5000,
        icon: <FaCheckCircle style={{ color: '#10B981' }} />
      }
    );

    // Vider le panier et rediriger après délai
    setTimeout(() => {
      dispatch(CLEAR_CART());
      resetPaymentFlow();
      
      // Redirection vers page de succès
      window.location.href = `/payment-success?order=${orderId}&payment=${paymentId}&txid=${txid}`;
    }, 3000);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Erreur de paiement détaillée:', error);
    
    let userMessage = 'Échec du paiement. Veuillez réessayer.';
    let toastType = 'error';
    
    if (error.message?.includes('annulé') || error.message?.includes('cancel') || error.message?.includes('cancelled')) {
      userMessage = 'Paiement annulé par l\'utilisateur';
      toastType = 'info';
    } else if (error.message?.includes('network') || error.message?.includes('réseau')) {
      userMessage = 'Erreur réseau - Vérifiez votre connexion';
      toastType = 'warning';
    } else if (error.message?.includes('payments scope') || error.message?.includes('Permission')) {
      userMessage = 'Permission de paiement requise';
      setPermissionError(true);
    }

    // Afficher le toast approprié
    const toastConfig = { 
      position: "bottom-right", 
      autoClose: 6000,
      closeButton: true
    };

    if (toastType === 'error') {
      toast.error(userMessage, toastConfig);
    } else if (toastType === 'warning') {
      toast.warning(userMessage, toastConfig);
    } else {
      toast.info(userMessage, toastConfig);
    }

    resetPaymentFlow();
  };

  const resetPaymentFlow = () => {
    setPaymentFlow({
      showPreModal: false,
      piInterfaceOpen: false, 
      processing: false,
      completed: false
    });
    setPiStatus('');
    setCurrentOrder(null);
    setPermissionError(false);
  };

  /* --------------------------------------------------------------
     FONCTIONS SERVEUR (SIMULATION - À REMPLACER PAR VOS APIS)
  -------------------------------------------------------------- */
  const approvePaymentOnServer = async (paymentId, orderId, amount) => {
    console.log("📤 Simulation approbation serveur:", { paymentId, orderId, amount });
    
    // Remplacez par votre API réelle
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          paymentId,
          orderId,
          approvedAt: new Date().toISOString()
        });
      }, 1500);
    });
  };

  const completePaymentOnServer = async (paymentId, txid, orderId) => {
    console.log("📤 Simulation complétion serveur:", { paymentId, txid, orderId });
    
    // Remplacez par votre API réelle  
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          txid,
          orderId,
          completedAt: new Date().toISOString()
        });
      }, 1500);
    });
  };

  /* --------------------------------------------------------------
     MODALS
  -------------------------------------------------------------- */
  
  // MODAL 1: Votre modal de préparation
  const PreparationModal = () => (
    <div className={styles.modalOverlay} onClick={() => resetPaymentFlow()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={() => resetPaymentFlow()}
          disabled={piLoading}
        >
          <FaTimes />
        </button>

        <div className={styles.piPaymentContainer}>
          <div className={styles.piHeader}>
            <div className={styles.piLogo}>π</div>
            <h3>Confirmer le paiement</h3>
            <p>Vérifiez les détails avant de continuer vers Pi Network</p>
          </div>

          <div className={styles.orderSummary}>
            <h4>📦 Votre commande</h4>
            <div className={styles.summaryItems}>
              {cartItems.map((item, index) => (
                <div key={index} className={styles.summaryItem}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemDetails}>
                    {item.cartQuantity} × {item.price}π
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.finalAmount}>
            <div className={styles.amountRow}>
              <span>Total à payer:</span>
              <span className={styles.totalAmount}>{cartTotalAmount.toFixed(2)} π</span>
            </div>
            <div className={styles.amountNote}>
              Montant exact qui sera débité de votre portefeuille Pi
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.primaryButton}
              onClick={launchPiPayment}
              disabled={piLoading}
            >
              {piLoading ? (
                <>
                  <div className={styles.spinner}></div>
                  Préparation en cours...
                </>
              ) : (
                <>
                  <FaExternalLinkAlt />
                  Ouvrir l'interface Pi
                </>
              )}
            </button>

            <button
              className={styles.secondaryButton}
              onClick={() => resetPaymentFlow()}
              disabled={piLoading}
            >
              Annuler
            </button>
          </div>

          <div className={styles.paymentInfo}>
            <div className={styles.infoItem}>
              <div>🔒</div>
              <div>
                <strong>Paiement 100% sécurisé</strong>
                <p>Vous serez redirigé vers l'interface officielle Pi Network pour confirmer</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div>⚡</div>
              <div>
                <strong>Transaction instantanée</strong>
                <p>Le paiement est traité directement sur la blockchain Pi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // MODAL 2: Indicateur interface Pi ouverte
  const PiInterfaceModal = () => (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.piInterfaceContainer}>
          <div className={styles.piInterfaceHeader}>
            <div className={styles.piLogoLarge}>π</div>
            <h3>Interface Pi Network ouverte</h3>
            <p>Veuillez compléter le paiement dans la fenêtre Pi</p>
          </div>

          <div className={styles.interfaceStatus}>
            <div className={styles.interfaceIcon}>
              <FaExternalLinkAlt />
            </div>
            <div className={styles.interfaceMessage}>
              <p><strong>L'interface de paiement Pi est ouverte</strong></p>
              <p>Confirmez le paiement de <strong>{cartTotalAmount.toFixed(2)} π</strong> dans la fenêtre Pi Network</p>
            </div>
          </div>

          {piStatus && (
            <div className={styles.interfaceStatusMessage}>
              {piLoading && <div className={styles.spinner}></div>}
              {piStatus}
            </div>
          )}

          <div className={styles.interfaceHelp}>
            <p>💡 <strong>Instructions :</strong></p>
            <ul>
              <li>L'interface officielle Pi s'est ouverte dans une nouvelle fenêtre</li>
              <li>Vérifiez le montant : <strong>{cartTotalAmount.toFixed(2)} π</strong></li>
              <li>Acceptez les conditions d'utilisation</li>
              <li>Cliquez sur "Payer" pour confirmer</li>
              <li>Vous serez automatiquement redirigé ici après confirmation</li>
            </ul>
          </div>

          <div className={styles.interfaceActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => resetPaymentFlow()}
              disabled={piLoading}
            >
              Annuler le processus
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // MODAL 3: Erreur de permission
  const PermissionErrorModal = () => (
    <div className={styles.modalOverlay} onClick={() => resetPaymentFlow()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={() => resetPaymentFlow()}
        >
          <FaTimes />
        </button>

        <div className={styles.permissionContainer}>
          <div className={styles.permissionHeader}>
            <div className={styles.permissionIcon}><FaLock /></div>
            <h3>Permission Requise</h3>
            <p>Autorisez les paiements pour utiliser Pi Network</p>
          </div>

          <div className={styles.permissionSteps}>
            <h4>Pour activer les paiements :</h4>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <strong>Ouvrez le menu Pi Browser</strong>
                <p>Cliquez sur les trois points (⋮) en haut à droite</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <strong>Allez dans "Paramètres de l'application"</strong>
                <p>Trouvez "SAPI Store" dans la liste des applications</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <strong>Activez l'autorisation "Paiements"</strong>
                <p>Cochez la permission pour autoriser les transactions</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <strong>Rechargez cette page</strong>
                <p>Retournez ici et réessayez le paiement</p>
              </div>
            </div>
          </div>

          <div className={styles.permissionActions}>
            <button
              className={styles.primaryButton}
              onClick={() => window.location.reload()}
            >
              🔄 Recharger la page
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => resetPaymentFlow()}
            >
              Retour au panier
            </button>
          </div>

          <div className={styles.permissionHelp}>
            <p>❓ <strong>Besoin d'aide ?</strong></p>
            <p>Si le problème persiste, vérifiez que vous utilisez la dernière version de Pi Browser.</p>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

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
          <p>Ajoutez des produits extraordinaires pour commencer vos achats</p>
          <Link to="/#products" className={styles.emptyButton}>
            🛍️ Découvrir les produits
          </Link>
          
          {/* Afficher la dernière commande réussie */}
          {localStorage.getItem('last_successful_order') && (
            <div className={styles.lastOrderInfo}>
              <p>📦 Votre dernière commande a été sauvegardée</p>
              <button 
                className={styles.viewOrderButton}
                onClick={() => {
                  const order = JSON.parse(localStorage.getItem('last_successful_order'));
                  window.location.href = `/payment-success?order=${order.orderId}`;
                }}
              >
                Voir les détails
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------
     RENDU PRINCIPAL
  -------------------------------------------------------------- */
  return (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        <h1>Panier d'achat</h1>
        <p>{cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''} dans votre panier</p>
      </div>

      <div className={styles.cartContent}>
        {/* Liste des articles */}
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h3>Vos produits sélectionnés</h3>
            <button className={styles.clearButton} onClick={clearCart}>
              <FaTrashAlt /> Vider le panier
            </button>
          </div>

          {cartItems.map((item) => (
            <div key={item.id} className={styles.cartItem}>
              <div className={styles.itemImage}>
                <img src={item.imageURL} alt={item.name} />
              </div>
              
              <div className={styles.itemInfo}>
                <h3>{item.name}</h3>
                <p className={styles.itemCategory}>{item.category}</p>
                <p className={styles.itemPrice}>{currency} {item.price}</p>
              </div>

              <div className={styles.itemControls}>
                <button
                  className={styles.controlBtn}
                  onClick={() => decreaseCart(item)}
                  disabled={item.cartQuantity <= 1}
                >
                  <FaMinus />
                </button>
                <span className={styles.quantity}>{item.cartQuantity}</span>
                <button
                  className={styles.controlBtn}
                  onClick={() => increaseCart(item)}
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
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>

        {/* Résumé de commande */}
        <div className={styles.cartSummary}>
          <div className={styles.summaryCard}>
            <h3>Résumé de commande</h3>
            
            <div className={styles.summaryRow}>
              <span>Sous-total ({cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''})</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span>Frais de livraison</span>
              <span className={styles.free}>Gratuite</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span>Taxes</span>
              <span>{currency} {(cartTotalAmount * 0).toFixed(2)}</span>
            </div>
            
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>

            {/* Bouton de paiement Pi */}
            <button
              className={styles.checkoutButton}
              onClick={startPiPaymentFlow}
              disabled={!isPiBrowser}
            >
              <span className={styles.piSymbol}>π</span>
              Payer {cartTotalAmount.toFixed(2)} Pi
            </button>

            {!isPiBrowser && (
              <div className={styles.piBrowserNote}>
                <span>📱</span>
                <div>
                  <strong>Ouvrez dans Pi Browser</strong>
                  <p>Pour payer avec Pi cryptocurrency</p>
                </div>
              </div>
            )}

            <div className={styles.securityNote}>
              <span>🔒</span>
              Paiement sécurisé par la blockchain Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            ← Continuer mes achats
          </Link>
        </div>
      </div>

      {/* Modals de paiement */}
      {paymentFlow.showPreModal && <PreparationModal />}
      {paymentFlow.piInterfaceOpen && <PiInterfaceModal />}
      {permissionError && <PermissionErrorModal />}
    </div>
  );
};

export default Cart;