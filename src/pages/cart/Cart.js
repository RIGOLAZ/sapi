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

/* ------------------------------------------------------------------
   1. DEBUG VISUEL (Pi Browser n’a pas de console)
------------------------------------------------------------------ */
const PiDebugPanel = ({ logs }) => (
  <div style={{
    position: 'fixed', top: 10, left: 10, zIndex: 9999,
    background: 'black', color: 'lime', fontSize: 12,
    padding: 8, borderRadius: 4, maxWidth: 300, maxHeight: 150,
    overflow: 'auto', fontFamily: 'monospace'
  }}>
    <b>🔍 Pi Debug</b><br />
    {logs.map((l, i) => <div key={i}>» {l}</div>)}
  </div>
);

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [showPiPayment, setShowPiPayment] = useState(false);
  const [piLoading, setPiLoading] = useState(false);
  const [piStatus, setPiStatus] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);

  const { isPiBrowser, createPayment } = usePiPayment();

  /* --------------------------------------------------------------
     Helpers
  -------------------------------------------------------------- */
  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
    toast.success(`${cart.name} added`, { position: "bottom-right" });
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
    toast.info(`${cart.name} removed`, { position: "bottom-right" });
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
    toast.error(`${cart.name} deleted`, { position: "bottom-right" });
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
    toast.info('Cart cleared', { position: "bottom-right" });
  };

  const log = (msg) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-9), `${ts} ${msg}`]);
  };

  const handlePiPay = async () => {
  if (!isPiBrowser) {
    toast.info("📱 Please open in Pi Browser to pay with Pi", { position: "bottom-right", autoClose: 4000 });
    return;
  }
  if (cartItems.length === 0) {
    toast.warning("🛒 Your cart is empty", { position: "bottom-right" });
    return;
  }

  setPiLoading(true);
  try {
    await createPayment(
      cartTotalAmount.toFixed(2),
      'Order from SAPI Cart',
      { items: cartItems }
    );
  } catch (e) {
    console.error('Erreur paiement', e);
  } finally {
    setPiLoading(false);
  }
};

  // 🔥 FONCTIONNALITÉ PI NETWORK (exactement comme demo)
    const handlePiPayment = async () => {
    log("1. Début");
    log("2. isPiBrowser ? " + isPiBrowser);
    log("3. cartItems.length ? " + cartItems.length);

    if (!isPiBrowser) {
      log("❌ Pas Pi Browser");
      toast.info("📱 Please open in Pi Browser to pay with Pi", { position: "bottom-right", autoClose: 4000 });
      return;
    }
    if (cartItems.length === 0) {
      log("❌ Panier vide");
      toast.warning("🛒 Your cart is empty", { position: "bottom-right" });
      return;
    }
    if (!window.Pi) {
  log("❌ Pi SDK absent - redirige vers Pi Browser");
  toast.error("Please open this page in Pi Browser to pay", {
    position: "bottom-right",
    autoClose: 8000
  });
  // Optionnel : lien vers Pi Browser
  window.open("https://minepi.com/browser", "_blank");
  return;
}

    setPiLoading(true);
    setPiStatus('Initializing Pi payment...');
    log("4. Avant createPayment");

    try {
      const orderId = `CMD-${Date.now()}`;
      // Sécurise le montant
const raw = Number(cartTotalAmount);
if (isNaN(raw) || raw <= 0) {
  log("❌ Montant invalide ou nul");
  toast.error("Invalid amount", { position: "bottom-right" });
  return;
}
const amountInPi = raw.toFixed(2);

// Sécurise les items
const safeItems = (Array.isArray(cartItems) ? cartItems : []).map(item => ({
  id: String(item?.id || ''),
  name: String(item?.name || ''),
  price: Number(item?.price || 0),
  quantity: Number(item?.cartQuantity || 1),
  imageURL: String(item?.imageURL || '')
}));
    const memo = `Order ${orderId} – SAPI Cart`;
    // Sécurise le metadata
    const metadata = {
      orderId: orderId,
      userId: String(localStorage.getItem('userId') || 'anonymous'),
      itemsCount: safeItems.length,
      totalAmount: Number(raw),
      items: safeItems,
      timestamp: Date.now(),
      source: 'sapi_cart'
    };
      log("0. window.Pi type : " + typeof window.Pi);
      log("0. User-Agent     : " + navigator.userAgent);
      log("4b. cartItems type : " + typeof cartItems);
      log("4c. cartItems      : " + JSON.stringify(cartItems));
      log("4d. cartTotalAmount : " + cartTotalAmount);
      log("4e. metadata.items  : " + JSON.stringify(metadata.items));
      log("4f. metadata        : " + JSON.stringify(metadata));
      log("5. Appel createPayment...");
      log("5b. amount : " + amountInPi);
      log("5c. items  : " + JSON.stringify(metadata.items));
      const paymentResult = await createPayment(amountInPi, memo, metadata);
      log("6. Succès : " + JSON.stringify(paymentResult));
      handlePaymentSuccess(paymentResult, orderId);
    } catch (e) {
      log("❌ Erreur : " + e.message);
      handlePaymentError(e);
    } finally {
      setPiLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentResult, orderId) => {
    log("7. Succès final");
    setPiStatus('Payment completed! 🎉');
    toast.success(`Payment successful! Order: ${orderId}`, { position: "bottom-right", autoClose: 3000 });
    setTimeout(() => {
      dispatch(CLEAR_CART());
      setShowPiPayment(false);
      window.location.href = `/payment-success?order=${orderId}&payment=${paymentResult.paymentId}`;
    }, 2000);
  };

  const handlePaymentError = (error) => {
    log("❌ Erreur finale : " + error.message);
    let userMsg = 'Payment failed';
    if (error.message?.toLowerCase().includes('cancel')) userMsg = 'You cancelled the payment';
    else if (error.message?.toLowerCase().includes('network')) userMsg = 'Network error – order saved locally';
    else userMsg = error.message;

    toast.error(userMsg, { position: "bottom-right", autoClose: 6000 });

    if (error.message?.toLowerCase().includes('network')) {
      localStorage.setItem('pendingOrder', JSON.stringify({
        items: cartItems,
        total: cartTotalAmount,
        orderId: `CMD-${Date.now()}`,
        timestamp: new Date().toISOString()
      }));
    }

    setShowPiPayment(false);
    setPiStatus('');
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
            <h3>💳 Pi Network Payment</h3>
            <p>Secure payment with Pi</p>
          </div>

          {piStatus && (
            <div className={styles.piStatus}>
              {piLoading && <span className={styles.piSpinner}></span>}
              {piStatus}
            </div>
          )}

          <div className={styles.piAmount}>
            <h4>Amount to pay:</h4>
            <p className={styles.piAmountValue}>{cartTotalAmount.toFixed(2)} Pi</p>
          </div>

          <div className={styles.piActions}>
            <button
              className={styles.piConfirmButton}
              onClick={handlePiPayment}
              disabled={piLoading}
            >
              {piLoading ? (
                <>
                  <span className={styles.piSpinner}></span>
                  Processing...
                </>
              ) : (
                'Confirm Payment'
              )}
            </button>

            <button
              className={styles.piCancelButton}
              onClick={() => setShowPiPayment(false)}
              disabled={piLoading}
            >
              Cancel
            </button>
          </div>

          {!isPiBrowser && (
            <div className={styles.piBrowserWarning}>
              📱 Please open this page in Pi Browser to make payments
            </div>
          )}

          <div className={styles.piSecurityNote}>
            🔒 Your payment is secured by Pi Network
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

  // 🔥 GESTION PANIER VIDE (inchangée)
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}><FaShoppingBag /></div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started</p>
          <Link to="/#products" className={styles.emptyButton}>Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        <h1>Shopping Cart</h1>
        <p>{cartTotalQuantity} items</p>
      </div>

      <div className={styles.cartContent}>
        <div className={styles.cartItems}>
          <div className={styles.itemsHeader}>
            <h3>Products</h3>
            <button className={styles.clearButton} onClick={clearCart}>
              <FaTrashAlt /> Clear all
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
            <h3>Order Summary</h3>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Delivery</span>
              <span className={styles.free}>Free</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Tax</span>
              <span>{currency} {(cartTotalAmount * 0).toFixed(2)}</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
            </div>

            {/* 🔥 BOUTON PI PAYMENT (respecte ton design) */}
           <button
  className={styles.checkoutButton}
  onClick={handlePiPay}
  disabled={!isPiBrowser || piLoading}
>
  {piLoading ? (
    <>
      <span className={styles.piSpinner}></span>
      Processing...
    </>
  ) : (
    <>Pay {cartTotalAmount.toFixed(2)} Pi</>
  )}
</button>

            {!isPiBrowser && (
              <div className={styles.piBrowserNote}>
                📱 Open in Pi Browser to pay
              </div>
            )}

            <div className={styles.securityNote}>
              🔒 Secure payment with Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* 🔥 MODAL PI PAYMENT (respecte ton design) */}
      {showPiPayment && <PiPaymentModal />}
    </div>
  );
};

export default Cart;