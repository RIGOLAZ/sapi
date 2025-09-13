import React, { useEffect, useState } from "react";
import { currency } from "..";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';
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
import { FaTrashAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/card/Card";
import { selectIsLoggedIn, selectUserID } from "../../redux/slice/authSlice";
import PayWithPi from "../../components/piPayment/PayWithPi";

const Cart = () => {
  const cartItems = useSelector(selectCartItems);
  const cartTotalAmount = useSelector(selectCartTotalAmount);
  const cartTotalQuantity = useSelector(selectCartTotalQuantity);
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const userId = useSelector(selectUserID);
  const navigate = useNavigate();

  const [showPiPayment, setShowPiPayment] = useState(false);

  const increaseCart = (cart) => {
    dispatch(ADD_TO_CART(cart));
  };

  const decreaseCart = (cart) => {
    dispatch(DECREASE_CART(cart));
  };

  const removeFromCart = (cart) => {
    dispatch(REMOVE_FROM_CART(cart));
  };

  const clearCart = () => {
    dispatch(CLEAR_CART());
  };

  useEffect(() => {
    dispatch(CALCULATE_SUBTOTAL());
    dispatch(CALCULATE_TOTAL_QUANTITY());
    dispatch(SAVE_URL(""));
  }, [cartItems, dispatch]);

  const url = window.location.href;

  const handlePiPaymentSuccess = () => {
    toast.success('Payment successful! Thank you for your purchase.');
    dispatch(CLEAR_CART());
    navigate('/checkout-success');
  };

  const handlePiPaymentError = (error) => {
    toast.error(`Payment failed: ${error.message || error}`);
  };

  const handlePiPayment = () => {
    if (!isLoggedIn) {
      dispatch(SAVE_URL(url));
      navigate("/login");
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    
    setShowPiPayment(true);
  };

  return (
    <section>
      <div className={`container ${styles.table}`}>
        <h2 style={{margin:'20px 0 0 0'}}>Shopping Cart</h2>
        {cartItems.length === 0 ? (
          <>
            <p>Your cart is currently empty.</p>
            <br />
            <div>
              <Link to="/#products">&larr; Continue shopping</Link>
            </div>
          </>
        ) : (
          <>
          <br/>
            <div>
              <Link to="/#products">&larr; Continue shopping</Link>
            </div>
            <br/>
            <table>
              <thead>
                <tr>
                  <th>s/n</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((cart, index) => {
                  const { id, name, price, imageURL, cartQuantity } = cart;
                  return (
                    <tr key={id}>
                      <td>{index + 1}</td>
                      <td>
                        <p>
                          <b>{name}</b>
                        </p>
                        <img
                          src={imageURL}
                          alt={name}
                          style={{ width: "100px" }}
                        />
                      </td>
                      <td>{currency} {price}</td>
                      <td>
                        <div className={styles.count}>
                          <button
                            className="--btn"
                            onClick={() => decreaseCart(cart)}
                            disabled={cartQuantity <= 1}
                          >
                            -
                          </button>
                          <p>
                            <b>{cartQuantity}</b>
                          </p>
                          <button
                            className="--btn"
                            onClick={() => increaseCart(cart)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>{currency} {(price * cartQuantity).toFixed(2)}</td>
                      <td className={styles.icons}>
                        <FaTrashAlt
                          size={19}
                          color="red"
                          onClick={() => removeFromCart(cart)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={styles.summary}>
              <button className="--btn --btn-danger" onClick={clearCart}>
                Clear Cart
              </button>
              <div className={styles.checkout}>
                <div>
                  <Link to="/#products">&larr; Continue shopping</Link>
                </div>
                <br />
                <Card cardClass={styles.card}>
                  <p>
                    <b> {`Cart item(s): ${cartTotalQuantity}`}</b>
                  </p>
                  <div className={styles.text}>
                    <h4>Subtotal:</h4>
                    <h3>{`${currency} ${cartTotalAmount.toFixed(2)}`}</h3>
                  </div>
                  <p>Tax and shipping calculated at checkout</p>
                  
                  {/* UNIQUE BOUTON DE PAIEMENT - Pay with Pi Network */}
                  <button 
                    className="--btn --btn-primary" 
                    onClick={handlePiPayment}
                    style={{ marginBottom: '10px', width: '100%' }}
                  >
                    Pay with Pi Network
                  </button>
                  
                  {/* Affichage du composant de paiement Pi */}
                  {showPiPayment && (
                    <PayWithPi
                      cartItems={cartItems}
                      totalAmount={cartTotalAmount}
                      onSuccess={handlePiPaymentSuccess}
                      onError={handlePiPaymentError}
                      userId={userId}
                    />
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Cart;