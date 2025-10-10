import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orderHistory: [],
  totalOrderAmount: null,
  currentOrder: null,
  isProcessing: false,
  paymentSuccess: false
};

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    STORE_ORDERS(state, action) {
      state.orderHistory = action.payload;
    },
    CALC_TOTAL_ORDER_AMOUNT: (state) => {
      const rawTotal = state.orderHistory.reduce((sum, o) => {
        const str = (o.orderAmount || '0').toString().replace(/[^\d.]/g, '');
        return sum + (Number(str) || 0);
      }, 0);
      state.totalOrderAmount = Number(rawTotal.toFixed(2));
    },
    // AJOUTER CE REDUCER
    RESET_AFTER_PAYMENT: (state) => {
      state.currentOrder = null;
      state.isProcessing = false;
      state.paymentSuccess = true;
    }
  }
});

export const { 
  STORE_ORDERS, 
  CALC_TOTAL_ORDER_AMOUNT,
  RESET_AFTER_PAYMENT  // AJOUTER CET EXPORT
} = orderSlice.actions;

export const selectOrderHistory = (state) => state.orders.orderHistory;
export const selectTotalOrderAmount = (state) => state.orders.totalOrderAmount;
export default orderSlice.reducer;