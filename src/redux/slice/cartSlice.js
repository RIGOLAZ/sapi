import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItems: [],
  cartTotalAmount: 0,
  cartTotalQuantity: 0,
  previousURL: ""
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    ADD_TO_CART: (state, action) => {
      const product = action.payload;
      const existingItem = state.cartItems.find(item => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cartItems.push({ ...product, quantity: 1 });
      }
      
      // Recalculer les totaux
      state.cartTotalQuantity = state.cartItems.reduce((total, item) => total + item.quantity, 0);
      state.cartTotalAmount = state.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    DECREASE_CART: (state, action) => {
      const product = action.payload;
      const existingItem = state.cartItems.find(item => item.id === product.id);
      
      if (existingItem && existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        state.cartItems = state.cartItems.filter(item => item.id !== product.id);
      }
      
      // Recalculer les totaux
      state.cartTotalQuantity = state.cartItems.reduce((total, item) => total + item.quantity, 0);
      state.cartTotalAmount = state.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    REMOVE_FROM_CART: (state, action) => {
      const productId = action.payload;
      state.cartItems = state.cartItems.filter(item => item.id !== productId);
      
      // Recalculer les totaux
      state.cartTotalQuantity = state.cartItems.reduce((total, item) => total + item.quantity, 0);
      state.cartTotalAmount = state.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    CLEAR_CART: (state) => {
      state.cartItems = [];
      state.cartTotalAmount = 0;
      state.cartTotalQuantity = 0;
    },

    CALCULATE_TOTAL: (state) => {
      state.cartTotalAmount = state.cartItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    },

    CALCULATE_SUBTOTAL: (state) => {
      state.cartTotalAmount = state.cartItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
    },

    CALCULATE_TOTAL_QUANTITY: (state) => {
      state.cartTotalQuantity = state.cartItems.reduce((total, item) => {
        return total + item.quantity;
      }, 0);
    },

    SAVE_URL: (state, action) => {
      state.previousURL = action.payload;
    }
  }
});

export const { 
  ADD_TO_CART, 
  DECREASE_CART,
  REMOVE_FROM_CART, 
  CLEAR_CART, 
  CALCULATE_TOTAL,
  CALCULATE_SUBTOTAL,
  CALCULATE_TOTAL_QUANTITY,
  SAVE_URL
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.cartItems;
export const selectCartTotalAmount = (state) => state.cart.cartTotalAmount;
export const selectCartTotalQuantity = (state) => state.cart.cartTotalQuantity;
export const selectPreviousURL = (state) => state.cart.previousURL;

export default cartSlice.reducer;