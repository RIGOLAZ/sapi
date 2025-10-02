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
import { FaTrashAlt, FaPlus, FaMinus, FaShoppingBag, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { usePiPayment } from "../../hooks/usePiPayment";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [showPiPayment, setShowPiPayment] = useState(false);
  const [piLoading, setPiLoading] = useState(false);

  // Hook Pi Payment
  const { 
    isPiBrowser, 
    loading, 
    error, 
    createPayment,
    testSDK // ✅ Maintenant disponible
  } = usePiPayment();

  /* --------------------------------------------------------------
     Helpers Cart
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
     PAIEMENT PI
  -------------------------------------------------------------- */
  // 🧪 FONCTION DE TEST AMÉLIORÉE
const handlePiPay = async () => {
  console.log('🛒 Paiement Pi - Mode production');
  
  if (!isPiBrowser) {
    toast.info("📱 Ouvrez dans Pi Browser", { position: "bottom-right" });
    return;
  }

  if (cartItems.length === 0) {
    toast.warning("🛒 Panier vide", { position: "bottom-right" });
    return;
  }

  setPiLoading(true);

  try {
    const orderId = `CMD-${Date.now()}`;
    const amount = cartTotalAmount.toFixed(2);
    
    const metadata = {
      orderId: orderId,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price
      })),
      totalItems: cartTotalQuantity
    };

    const memo = `Achat de ${cartTotalQuantity} article(s) - ${amount} Pi`;

    console.log('🎯 Commande:', orderId);

    // APPEL PAIEMENT
    const result = await createPayment(amount, memo, metadata);
    
    console.log('✅✅✅ PAIEMENT TERMINÉ!', result);
    
    // SUCCÈS
    if (result.real) {
      toast.success(`Paiement Pi RÉUSSI! 🎉`, {
        position: "bottom-right",
        autoClose: 5000 
      });
    } else {
      toast.success(`Paiement simulé réussi! 🎉 (Bug Pi connu)`, {
        position: "bottom-right",
        autoClose: 5000 
      });
    }
    
    // Vider panier
    dispatch(CLEAR_CART());
    
    // Redirection
    setTimeout(() => {
      window.location.href = `/checkout-success?order=${result.orderId}&txid=${result.txid}&amount=${amount}`;
    }, 1500);

  } catch (error) {
    console.error('❌ Erreur:', error);
    toast.error(`Erreur: ${error.message}`, { position: "bottom-right" });
  } finally {
    setPiLoading(false);
  }
};

  /* --------------------------------------------------------------
     Modal Pi Payment
  -------------------------------------------------------------- */
  const PiPaymentModal = () => (
    <div className={styles.modalOverlay} onClick={() => setShowPiPayment(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={() => setShowPiPayment(false)}>
          <FaTimes />
        </button>

        <div className={styles.piPaymentContainer}>
          <div className={styles.piHeader}>
            <h3>💳 Paiement Pi Network</h3>
            <p>Paiement sécurisé avec Pi</p>
          </div>

          <div className={styles.piAmount}>
            <h4>Montant à payer:</h4>
            <p className={styles.piAmountValue}>{cartTotalAmount.toFixed(2)} Pi</p>
          </div>

          <div className={styles.piActions}>
            <button
              className={styles.piConfirmButton}
              onClick={handlePiPay}
              disabled={piLoading || loading}
            >
              {(piLoading || loading) ? (
                <>
                  <span className={styles.piSpinner}></span>
                  Traitement...
                </>
              ) : (
                'Confirmer le paiement'
              )}
            </button>

            <button
              className={styles.piCancelButton}
              onClick={() => setShowPiPayment(false)}
              disabled={piLoading || loading}
            >
              Annuler
            </button>
          </div>

          {!isPiBrowser && (
            <div className={styles.piBrowserWarning}>
              📱 Ouvrez cette page dans Pi Browser pour payer avec Pi
            </div>
          )}

          <div className={styles.piSecurityNote}>
            🔒 Paiement sécurisé par Pi Network
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

  // Gestion panier vide
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}><FaShoppingBag /></div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits pour commencer</p>
          <Link to="/#products" className={styles.emptyButton}>Continuer les achats</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        <h1>Panier d'achat</h1>
        <p>{cartTotalQuantity} articles</p>
      </div>

      <div className={styles.cartContent}>
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h3>Produits</h3>
            <button className={styles.clearButton} onClick={clearCart}>
              <FaTrashAlt /> Tout vider
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
                ><FaMinus /></button>
                <span className={styles.quantity}>{item.cartQuantity}</span>
                <button
                  className={styles.controlBtn}
                  onClick={() => increaseCart(item)}
                ><FaPlus /></button>
              </div>

              <div className={styles.itemTotal}>
                {currency} {(item.price * item.cartQuantity).toFixed(2)}
              </div>

              <button
                className={styles.removeBtn}
                onClick={() => removeFromCart(item)}
              ><FaTimes /></button>
            </div>
          ))}
        </div>

        <div className={styles.cartSummary}>
          <div className={styles.summaryCard}>
            <h3>Résumé de la commande</h3>
            <div className={styles.summaryRow}>
              <span>Sous-total ({cartTotalQuantity} articles)</span>
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

            {/* BOUTON PAIEMENT PI */}
            <button
              className={styles.checkoutButton}
              onClick={handlePiPay}
              disabled={!isPiBrowser || piLoading || loading}
            >
              {(piLoading || loading) ? (
                <>
                  <span className={styles.piSpinner}></span>
                  Traitement...
                </>
              ) : (
                `Payer ${cartTotalAmount.toFixed(2)} Pi`
              )}
            </button>

            {!isPiBrowser && (
              <div className={styles.piBrowserNote}>
                📱 Ouvrez dans Pi Browser pour payer avec Pi
              </div>
            )}

            <div className={styles.securityNote}>
              🔒 Paiement sécurisé avec Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            Continuer les achats
          </Link>
        </div>
      </div>

      {/* MODAL PAIEMENT PI */}
      {showPiPayment && <PiPaymentModal />}
    </div>
  );
};

export default Cart;