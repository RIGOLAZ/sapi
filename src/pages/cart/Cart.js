// src/pages/Cart/Cart.js

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingBag, FaTrashAlt, FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Importer vos actions Redux
import {
  ADD_TO_CART,
  DECREASE_CART,
  REMOVE_FROM_CART,
  CLEAR_CART,
  CALCULATE_SUBTOTAL,
  CALCULATE_TOTAL_QUANTITY,
  selectCartItems,
  selectCartTotalAmount,
  selectCartTotalQuantity
} from '../../redux/slice/cartSlice';
import { SAVE_URL } from '../../redux/slice/authSlice'; // Assurez-vous que cette action est bien définie
import { initiatePiPayment } from '../../lib/PiPayment'; // La fonction de paiement Pi
import styles from './Cart.module.css';

const currency = "Pi";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loadingPayment, setLoadingPayment] = useState(false);

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

  const handlePiPayment = async () => {
    if (cartItems.length === 0) {
      toast.error("Votre panier est vide.", { position: "bottom-right" });
      return;
    }

    setLoadingPayment(true);
    toast.info("Lancement du paiement Pi...", { position: "bottom-right" });

    const totalPiAmount = cartTotalAmount;
    const pendingOrder = {
      items: cartItems,
      total: totalPiAmount,
    };

    try {
      await initiatePiPayment(totalPiAmount, pendingOrder.items);

      dispatch(CLEAR_CART());
      localStorage.removeItem('pendingOrder');
      toast.success("Paiement réussi !", { position: "bottom-right" });
      navigate('/confirmation');
    } catch (error) {
      console.error("Erreur de paiement Pi:", error);
      
      const errorMessage = error.message;
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        toast.error("Erreur réseau. Le paiement sera traité à la prochaine connexion.", {
          position: "bottom-right",
          autoClose: 5000
        });
        localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
      } else {
        toast.error(`Paiement échoué: ${errorMessage}`, {
          position: "bottom-right"
        });
      }
    } finally {
      setLoadingPayment(false);
    }
  };

  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

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

            <button
              className={styles.checkoutButton}
              onClick={handlePiPayment}
              disabled={loadingPayment || cartItems.length === 0}
            >
              {loadingPayment ? 'Paiement en cours...' : `Payer ${cartTotalAmount.toFixed(2)} Pi`}
            </button>

            <div className={styles.securityNote}>
              🔒 Secure payment with Pi Network
            </div>
          </div>

          <Link to="/#products" className={styles.continueLink}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
