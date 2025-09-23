// src/pages/cart/Cart.js
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
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [showPiPayment, setShowPiPayment] = useState(false);
  const [piLoading, setPiLoading] = useState(false);
  const [piStatus, setPiStatus] = useState('');

  // Hook Pi Network (comme dans la demo)
  const { isPiBrowser, loading, error, paymentStatus, createPayment } = usePiPayment();

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

  // 🔥 FONCTIONNALITÉ PI NETWORK (exactement comme demo)
  const handlePiPayment = async () => {
    if (!isPiBrowser) {
      toast.info("📱 Please open in Pi Browser to pay with Pi", {
        position: "bottom-right",
        autoClose: 4000
      });
      return;
    }

    if (cartItems.length === 0) {
      toast.warning("🛒 Your cart is empty", { position: "bottom-right" });
      return;
    }

    setPiLoading(true);
    setPiStatus('Initializing Pi payment...');

    try {
      // Générer ID commande (comme demo)
      const orderId = `CMD-${Date.now()}`;
      const amountInPi = cartTotalAmount.toFixed(2);
      const memo = `Order ${orderId} – SAPI Cart`;

      // Métadonnées (comme demo)
      const metadata = {
        orderId: orderId,
        userId: localStorage.getItem('userId') || 'anonymous',
        itemsCount: cartItems.length,
        totalAmount: cartTotalAmount,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity,
          imageURL: item.imageURL
        })),
        timestamp: Date.now(),
        source: 'sapi_cart'
      };

      setPiStatus('Connecting to Pi Network...');

      // 🔥 CRÉER LE PAIEMENT (exactement comme demo)
      const paymentResult = await createPayment(amountInPi, memo, metadata);
      
      // 🔥 SUCCÈS (comme demo)
      handlePaymentSuccess(paymentResult, orderId);
      
    } catch (error) {
      // 🔥 ERREUR (comme demo)
      handlePaymentError(error);
    } finally {
      setPiLoading(false);
    }
  };

  // 🔥 GESTION SUCCÈS (exactement comme demo)
  const handlePaymentSuccess = (paymentResult, orderId) => {
    console.log('✅ Payment successful:', paymentResult);
    
    setPiStatus('Payment completed! 🎉');
    
    toast.success(`Payment successful! Order: ${orderId}`, {
      position: "bottom-right",
      autoClose: 3000
    });

    // Vider le cart (comme demo)
    setTimeout(() => {
      dispatch(CLEAR_CART());
      setShowPiPayment(false);
      
      // Rediriger vers succès (comme demo)
      window.location.href = `/payment-success?order=${orderId}&payment=${paymentResult.paymentId}`;
    }, 2000);
  };

  // 🔥 GESTION ERREURS (exactement comme demo)
  const handlePaymentError = (error) => {
    console.error('❌ Payment error:', error);
    
    if (error.message?.includes('cancelled')) {
      setPiStatus('Payment cancelled by user');
      toast.info('Payment cancelled', { position: "bottom-right" });
    } else if (error.message?.includes('network')) {
      setPiStatus('Network error - payment saved locally');
      
      // Sauvegarder localement (comme demo)
      const pendingOrder = {
        items: cartItems,
        total: cartTotalAmount,
        orderId: `CMD-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
      
      toast.error("Network error. Payment will be processed when connection is restored.", {
        position: "bottom-right",
        autoClose: 5000
      });
    } else {
      setPiStatus(`Payment failed: ${error.message}`);
      toast.error(`Payment failed: ${error.message}`, {
        position: "bottom-right"
      });
    }
    
    setTimeout(() => {
      setShowPiPayment(false);
    }, 3000);
  };

  // 🔥 MODAL PI PAYMENT (respecte ton design)
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

          {paymentStatus && (
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
              onClick={() => setShowPiPayment(true)}
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