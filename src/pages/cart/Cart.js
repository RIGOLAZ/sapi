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
import { Link, useNavigate } from "react-router-dom";
import PayWithPi from "../../components/piPayment/PayWithPi";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();

  const [showPiPayment, setShowPiPayment] = useState(false);

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

  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}>
            <FaShoppingBag />
          </div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started</p>
          <Link to="/#products" className={styles.emptyButton}>
            Continue Shopping
          </Link>
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
              <FaTrashAlt />
              Clear all
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
              <span>{currency} {(cartTotalAmount * 1).toFixed(2)}</span>
            </div>

            <button 
              className={styles.checkoutButton}>
              Pay with Pi Network
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

      {showPiPayment && (
        <div className={styles.modalOverlay} onClick={() => setShowPiPayment(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={() => setShowPiPayment(false)}
            >
              <FaTimes />
            </button>
            <PayWithPi/>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;