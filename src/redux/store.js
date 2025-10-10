// redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slice/authSlice';
import orderReducer from './slice/orderSlice';
import cartReducer from './slice/cartSlice';
import productSlice from './slice/productSlice'; // Import correct
import filterReducer from './slice/filterSlice'; // AJOUTEZ cette ligne

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    cart: cartReducer,
    product: productSlice, // ⚠️ Doit être "product" et non "products"
    filter: filterReducer, // AJOUTEZ cette ligne

  },
});

export default store;