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
import { FaTrashAlt, FaPlus, FaMinus, FaShoppingBag, FaTimes, FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import usePiPayment from "../../hooks/usePiPayment";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [showPiPayment, setShowPiPayment] = useState(false);
  const [piStatus, setPiStatus] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  
  const { isPiBrowser, createPayment, loading: piLoading, isInitialized } = usePiPayment();

  /* --------------------------------------------------------------
     HELPERS CART
  -------------------------------------------------------------- */
  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
    toast.success(`${cart.name} ajouté au panier`, { position: "bottom-right" });
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
    toast.info(`${cart.name} quantité diminuée`, { position: "bottom-right" });
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
    toast.error(`${cart.name} retiré du panier`, { position: "bottom-right" });
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
    toast.info('Panier vidé', { position: "bottom-right" });
  };

  /* --------------------------------------------------------------
     GESTION PI PAYMENT
  -------------------------------------------------------------- */
  const handlePiPay = async () => {
    console.log("🚀 Début du processus de paiement Pi");
    
    // Validation de base
    if (!isPiBrowser) {
      toast.info("📱 Veuillez ouvrir dans Pi Browser pour payer avec Pi", { 
        position: "bottom-right", 
        autoClose: 5000 
      });
      return;
    }

    if (cartItems.length === 0) {
      toast.warning("🛒 Votre panier est vide", { position: "bottom-right" });
      return;
    }

    if (!window.Pi) {
      toast.error("❌ SDK Pi non détecté. Veuillez rafraîchir dans Pi Browser.", {
        position: "bottom-right",
        autoClose: 6000
      });
      return;
    }

    setPiStatus('Préparation du paiement...');
    setShowPiPayment(true);

    try {
      const orderId = `SAPI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      setCurrentOrderId(orderId);
      
      const amount = parseFloat(cartTotalAmount.toFixed(2));
      
      // Validation du montant
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Montant de paiement invalide");
      }

      // Préparation des métadonnées
      const metadata = {
        orderId: orderId,
        userId: localStorage.getItem('userId') || 'guest',
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
          category: item.category
        })),
        totalItems: cartTotalQuantity,
        totalAmount: amount,
        timestamp: new Date().toISOString(),
        store: 'SAPI Store'
      };

      const memo = `SAPI Store - ${cartTotalQuantity} article(s) - ${orderId}`;

      console.log("💰 Détails du paiement:", { 
        amount, 
        memo, 
        metadata,
        isPiBrowser,
        isInitialized,
        hasWindowPi: !!window.Pi
      });

      setPiStatus('Ouverture de l\'interface Pi...');
      
      // Création du paiement
      const payment = await createPayment(amount, memo, metadata);
      
      console.log("✅ Processus de paiement démarré:", payment);
      setPiStatus('Interface de paiement ouverte ✓');
      
      // Le reste est géré par les callbacks dans le hook
      
    } catch (error) {
      console.error('❌ Erreur de paiement:', error);
      handlePaymentError(error);
    }
  };

  /* --------------------------------------------------------------
     GESTION DES RÉSULTATS
  -------------------------------------------------------------- */
  const handlePaymentSuccess = (paymentId, txid) => {
    setPiStatus('Paiement réussi ! 🎉');
    
    // Sauvegarder la commande localement
    const orderData = {
      orderId: currentOrderId,
      paymentId,
      txid,
      items: cartItems,
      total: cartTotalAmount,
      status: 'completed',
      date: new Date().toISOString()
    };

    localStorage.setItem(`order_${currentOrderId}`, JSON.stringify(orderData));
    localStorage.setItem('last_successful_order', JSON.stringify(orderData));
    
    toast.success(`Paiement réussi ! Commande: ${currentOrderId}`, { 
      position: "bottom-right", 
      autoClose: 4000,
      icon: <FaCheckCircle style={{ color: '#10B981' }} />
    });

    // Vider le panier et rediriger après délai
    setTimeout(() => {
      dispatch(CLEAR_CART());
      setShowPiPayment(false);
      setPiStatus('');
      
      // Redirection vers page de succès
      window.location.href = `/payment-success?order=${currentOrderId}&payment=${paymentId}&txid=${txid}`;
    }, 3000);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Erreur de paiement détaillée:', error);
    
    let userMessage = 'Échec du paiement. Veuillez réessayer.';
    let toastType = 'error';
    
    if (error.message?.includes('cancel') || error.message?.includes('annulé')) {
      userMessage = 'Paiement annulé';
      toastType = 'info';
    } else if (error.message?.includes('network') || error.message?.includes('réseau')) {
      userMessage = 'Erreur réseau - commande sauvegardée localement';
      toastType = 'warning';
      
      // Sauvegarder la commande en attente
      const pendingOrder = {
        orderId: currentOrderId,
        items: cartItems,
        total: cartTotalAmount,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      localStorage.setItem('pending_order', JSON.stringify(pendingOrder));
    } else if (error.message?.includes('SDK') || error.message?.includes('Pi')) {
      userMessage = 'Erreur Pi SDK. Veuillez rafraîchir la page.';
    }

    // Afficher le toast approprié
    if (toastType === 'error') {
      toast.error(userMessage, { position: "bottom-right", autoClose: 6000 });
    } else if (toastType === 'warning') {
      toast.warning(userMessage, { position: "bottom-right", autoClose: 6000 });
    } else {
      toast.info(userMessage, { position: "bottom-right", autoClose: 4000 });
    }

    setPiStatus('');
    setCurrentOrderId('');
  };

  const handleCloseModal = () => {
    if (!piLoading) {
      setShowPiPayment(false);
      setPiStatus('');
      setCurrentOrderId('');
    }
  };

  /* --------------------------------------------------------------
     MODAL PI PAYMENT
  -------------------------------------------------------------- */
  const PiPaymentModal = () => (
    <div className={styles.modalOverlay} onClick={handleCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={handleCloseModal}
          disabled={piLoading}
        >
          <FaTimes />
        </button>

        <div className={styles.piPaymentContainer}>
          <div className={styles.piHeader}>
            <div className={styles.piLogo}></div>
            <h3>Paiement Pi Network</h3>
            <p>Paiement sécurisé avec cryptocurrency Pi</p>
          </div>

          {/* Résumé de commande */}
          <div className={styles.piOrderSummary}>
            <h4>Résumé de la commande</h4>
            <div className={styles.piSummaryItems}>
              {cartItems.slice(0, 3).map((item, index) => (
                <div key={index} className={styles.piSummaryItem}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemDetails}>
                    {item.cartQuantity} × {item.price}
                  </span>
                </div>
              ))}
              {cartItems.length > 3 && (
                <div className={styles.piMoreItems}>
                  +{cartItems.length - 3} autre(s) article(s)
                </div>
              )}
            </div>
          </div>

          {/* Montant total */}
          <div className={styles.piAmountSection}>
            <div className={styles.piAmount}>
              <span>Montant total:</span>
              <span className={styles.piAmountValue}>{cartTotalAmount.toFixed(2)}</span>
            </div>
            <div className={styles.piConversion}>
              ≈ ${(cartTotalAmount * 3.14).toFixed(2)} USD
            </div>
          </div>

          {/* Statut du paiement */}
          {piStatus && (
            <div className={styles.piStatus}>
              {piLoading && <div className={styles.piSpinner}></div>}
              <span>{piStatus}</span>
            </div>
          )}

          {/* Actions */}
          <div className={styles.piActions}>
            <button
              className={`${styles.piConfirmButton} ${piLoading ? styles.loading : ''}`}
              onClick={handlePiPay}
              disabled={piLoading || !isPiBrowser}
            >
              {piLoading ? (
                <>
                  <div className={styles.piSpinner}></div>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Confirmer le paiement
                </>
              )}
            </button>

            <button
              className={styles.piCancelButton}
              onClick={handleCloseModal}
              disabled={piLoading}
            >
              Annuler
            </button>
          </div>

          {/* Informations */}
          <div className={styles.piInfo}>
            {!isPiBrowser ? (
              <div className={styles.piBrowserWarning}>
                <div>📱</div>
                <div>
                  <strong>Ouvrez dans Pi Browser</strong>
                  <p>Pour payer avec Pi, veuillez ouvrir cette page dans l'application Pi Browser</p>
                </div>
              </div>
            ) : (
              <div className={styles.piSecurityNote}>
                <div>🔒</div>
                <div>
                  <strong>Paiement sécurisé</strong>
                  <p>Votre transaction est protégée par la blockchain Pi Network</p>
                </div>
              </div>
            )}
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
          <p>Ajoutez des produits pour commencer vos achats</p>
          <Link to="/#products" className={styles.emptyButton}>
            Continuer les achats
          </Link>
          
          {/* Afficher la dernière commande réussie */}
          {localStorage.getItem('last_successful_order') && (
            <div className={styles.lastOrderInfo}>
              <p>Dernière commande réussie sauvegardée</p>
              <button 
                className={styles.viewOrderButton}
                onClick={() => {
                  const order = JSON.parse(localStorage.getItem('last_successful_order'));
                  window.location.href = `/payment-success?order=${order.orderId}`;
                }}
              >
                Voir la commande
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
        <p>{cartTotalQuantity} article{cartTotalQuantity > 1 ? 's' : ''}</p>
      </div>

      <div className={styles.cartContent}>
        {/* Liste des articles */}
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

        {/* Résumé de commande */}
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
              className={`${styles.checkoutButton} ${!isPiBrowser ? styles.disabled : ''}`}
              onClick={() => setShowPiPayment(true)}
              disabled={!isPiBrowser}
            >
              <span className={styles.piSymbol}></span>
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
              Paiement sécurisé par Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            Continuer les achats
          </Link>
        </div>
      </div>

      {/* Modal de paiement Pi */}
      {showPiPayment && <PiPaymentModal />}
    </div>
  );
};

export default Cart;