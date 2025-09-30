// components/Cart.js
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
import { FaTrashAlt, FaPlus, FaMinus, FaShoppingBag, FaTimes, FaExternalLinkAlt } from "react-icons/fa";
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

  const { isPiBrowser, createPayment, loading: piLoading, setupPiCallbacks } = usePiPayment();

  /* --------------------------------------------------------------
     GESTION DU PANIER
  -------------------------------------------------------------- */
  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
    toast.success(`${cart.name} ajouté`, { position: "bottom-right" });
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
    toast.info(`${cart.name} retiré`, { position: "bottom-right" });
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
    toast.error(`${cart.name} supprimé`, { position: "bottom-right" });
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
    toast.info('Panier vidé', { position: "bottom-right" });
  };

  /* --------------------------------------------------------------
     FLUX DE PAIEMENT RÉEL
  -------------------------------------------------------------- */
  const startPiPaymentFlow = () => {
    if (!isPiBrowser) {
      toast.info("📱 Ouvrez dans Pi Browser pour payer avec Pi", { 
        position: "bottom-right", 
        autoClose: 5000 
      });
      return;
    }

    if (cartItems.length === 0) {
      toast.warning("🛒 Votre panier est vide", { position: "bottom-right" });
      return;
    }

    // Étape 1: Ouvrir VOTRE modal de préparation
    setPaymentFlow(prev => ({ ...prev, showPreModal: true }));
    setPiStatus('Préparation du paiement...');
  };

  const launchPiPayment = async () => {
    try {
      const orderId = `SAPI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const amount = parseFloat(cartTotalAmount.toFixed(2));
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Montant invalide");
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
          quantity: item.cartQuantity
        })),
        totalItems: cartTotalQuantity,
        totalAmount: amount
      };

      const memo = `SAPI Store - ${cartTotalQuantity} article(s) - ${orderId}`;

      console.log("🎯 Lancement paiement Pi:", { amount, memo, metadata });

      // Configuration des callbacks Pi
      setupPiCallbacks(
        // onApproval
        async (paymentId) => {
          console.log("✅ Paiement approuvé par utilisateur:", paymentId);
          setPiStatus('Validation du paiement...');
          
          // Ici, vous appelez votre backend pour approuver
          const approvalResult = await approvePaymentOnServer(paymentId, orderId, amount);
          
          if (!approvalResult.success) {
            throw new Error("Échec approbation serveur");
          }
        },
        
        // onCompletion  
        async (paymentId, txid) => {
          console.log("✅ Transaction complétée:", paymentId, txid);
          setPiStatus('Finalisation de la commande...');
          
          // Ici, vous appelez votre backend pour compléter
          const completionResult = await completePaymentOnServer(paymentId, txid, orderId);
          
          if (completionResult.success) {
            // Compléter le paiement côté Pi
            if (window.Pi.completePayment) {
              await window.Pi.completePayment(paymentId, txid);
            }
            
            // Gérer le succès
            handlePaymentSuccess(orderId, paymentId, txid);
          } else {
            throw new Error("Échec complétion serveur");
          }
        },
        
        // onCancel
        (paymentId) => {
          console.log("❌ Paiement annulé dans l'interface Pi");
          setPiStatus('Paiement annulé');
          toast.info("Paiement annulé", { position: "bottom-right" });
          resetPaymentFlow();
        },
        
        // onError
        (error) => {
          console.error("❌ Erreur interface Pi:", error);
          setPiStatus('Erreur de paiement');
          handlePaymentError(error);
        }
      );

      // Étape 2: Fermer VOTRE modal et ouvrir l'interface Pi
      setPaymentFlow(prev => ({ 
        ...prev, 
        showPreModal: false, 
        piInterfaceOpen: true 
      }));
      
      setPiStatus('Ouverture interface Pi...');

      // Étape 3: Lancer le paiement - OUVRE L'INTERFACE OFFICIELLE PI
      const payment = await createPayment(amount, memo, metadata);
      
      console.log("🔗 Interface Pi ouverte:", payment);
      setPiStatus('Interface Pi Network ouverte - Confirmez le paiement');

    } catch (error) {
      console.error('❌ Erreur lancement paiement:', error);
      handlePaymentError(error);
      resetPaymentFlow();
    }
  };

  /* --------------------------------------------------------------
     GESTION DES RÉSULTATS
  -------------------------------------------------------------- */
  const handlePaymentSuccess = (orderId, paymentId, txid) => {
    setPaymentFlow(prev => ({ ...prev, processing: false, completed: true }));
    setPiStatus('🎉 Paiement réussi !');
    
    // Sauvegarder la commande
    const orderData = {
      orderId,
      paymentId,
      txid,
      items: cartItems,
      total: cartTotalAmount,
      status: 'completed',
      date: new Date().toISOString()
    };

    localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
    
    toast.success(`Paiement réussi ! Commande: ${orderId}`, { 
      position: "bottom-right", 
      autoClose: 4000 
    });

    // Vider le panier après délai
    setTimeout(() => {
      dispatch(CLEAR_CART());
      resetPaymentFlow();
      
      // Redirection vers page de succès
      window.location.href = `/payment-success?order=${orderId}&payment=${paymentId}&txid=${txid}`;
    }, 3000);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Erreur paiement:', error);
    
    let userMessage = 'Échec du paiement. Veuillez réessayer.';
    if (error.message?.includes('annulé') || error.message?.includes('cancel')) {
      userMessage = 'Paiement annulé';
    }
    
    toast.error(userMessage, { position: "bottom-right", autoClose: 5000 });
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
  };

  /* --------------------------------------------------------------
     FONCTIONS SERVEUR (SIMULATION)
  -------------------------------------------------------------- */
  const approvePaymentOnServer = async (paymentId, orderId, amount) => {
    console.log("📤 Simulation approbation serveur:", { paymentId, orderId, amount });
    
    // Remplacez par votre API réelle
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, paymentId });
      }, 1500);
    });
  };

  const completePaymentOnServer = async (paymentId, txid, orderId) => {
    console.log("📤 Simulation complétion serveur:", { paymentId, txid, orderId });
    
    // Remplacez par votre API réelle  
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, txid });
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
        >
          <FaTimes />
        </button>

        <div className={styles.piPaymentContainer}>
          <div className={styles.piHeader}>
            <div className={styles.piLogo}>π</div>
            <h3>Préparation du paiement</h3>
            <p>Vérifiez les détails avant de continuer</p>
          </div>

          <div className={styles.orderSummary}>
            <h4>Résumé de votre commande</h4>
            <div className={styles.summaryItems}>
              {cartItems.map((item, index) => (
                <div key={index} className={styles.summaryItem}>
                  <span>{item.name}</span>
                  <span>{item.cartQuantity} × {item.price}π</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.finalAmount}>
            <div className={styles.amountRow}>
              <span>Total à payer:</span>
              <span className={styles.totalAmount}>{cartTotalAmount.toFixed(2)} π</span>
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
                  Préparation...
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
                <strong>Paiement sécurisé</strong>
                <p>Vous serez redirigé vers l'interface officielle Pi Network</p>
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
          </div>

          <div className={styles.interfaceStatus}>
            <div className={styles.interfaceIcon}>
              <FaExternalLinkAlt />
            </div>
            <div className={styles.interfaceMessage}>
              <p><strong>L'interface de paiement Pi est ouverte</strong></p>
              <p>Veuillez confirmer votre paiement de <strong>{cartTotalAmount.toFixed(2)} π</strong> dans la fenêtre Pi Network</p>
            </div>
          </div>

          {piStatus && (
            <div className={styles.interfaceStatusMessage}>
              {piStatus}
            </div>
          )}

          <div className={styles.interfaceHelp}>
            <p>💡 <strong>Que se passe-t-il ?</strong></p>
            <ul>
              <li>L'interface officielle Pi s'est ouverte</li>
              <li>Confirmez le montant et acceptez les conditions</li>
              <li>Cliquez sur "Payer" dans l'interface Pi</li>
              <li>Vous serez automatiquement redirigé ici</li>
            </ul>
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
     RENDU PRINCIPAL
  -------------------------------------------------------------- */
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}><FaShoppingBag /></div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits pour commencer</p>
          <Link to="/#products" className={styles.emptyButton}>
            Continuer les achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        <h1>Panier d'achat</h1>
        <p>{cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''}</p>
      </div>

      <div className={styles.cartContent}>
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h3>Produits</h3>
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

        <div className={styles.cartSummary}>
          <div className={styles.summaryCard}>
            <h3>Résumé de commande</h3>
            
            <div className={styles.summaryRow}>
              <span>Sous-total</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>
            
            <div className={styles.summaryRow}>
              <span>Livraison</span>
              <span className={styles.free}>Gratuite</span>
            </div>
            
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>

            <button
              className={styles.checkoutButton}
              onClick={startPiPaymentFlow}
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
              Paiement sécurisé Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            Continuer les achats
          </Link>
        </div>
      </div>

      {/* Modals de paiement */}
      {paymentFlow.showPreModal && <PreparationModal />}
      {paymentFlow.piInterfaceOpen && <PiInterfaceModal />}
    </div>
  );
};

export default Cart;