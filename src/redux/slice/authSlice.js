import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoggedIn: false,
  email: null,
  userName: null,
  userID: null,
  adminStats: {
    totalOrders: 0,
    totalEarnings: 0,
    todayOrders: 0,
    todayEarnings: 0
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    SET_ACTIVE_USER: (state, action) => {
      const { email, userName, userID } = action.payload;
      state.isLoggedIn = true;
      state.email = email;
      state.userName = userName;
      state.userID = userID;
    },
    REMOVE_ACTIVE_USER: (state) => {
      state.isLoggedIn = false;
      state.email = null;
      state.userName = null;
      state.userID = null;
    },
    // Stats admin
    INCREMENT_ORDER_STATS: (state, action) => {
      const { amount } = action.payload;
      state.adminStats.totalOrders += 1;
      state.adminStats.todayOrders += 1;
      state.adminStats.totalEarnings += amount;
      state.adminStats.todayEarnings += amount;
    },
    UPDATE_ADMIN_STATS: (state, action) => {
      const { totalOrders, totalEarnings, todayOrders, todayEarnings } = action.payload;
      state.adminStats.totalOrders = totalOrders || 0;
      state.adminStats.totalEarnings = totalEarnings || 0;
      state.adminStats.todayOrders = todayOrders || 0;
      state.adminStats.todayEarnings = todayEarnings || 0;
    },
    RESET_TODAY_STATS: (state) => {
      state.adminStats.todayOrders = 0;
      state.adminStats.todayEarnings = 0;
    }
  },
});

export const { 
  SET_ACTIVE_USER, 
  REMOVE_ACTIVE_USER,
  INCREMENT_ORDER_STATS,
  UPDATE_ADMIN_STATS,
  RESET_TODAY_STATS
} = authSlice.actions;

export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectEmail = (state) => state.auth.email;
export const selectUserName = (state) => state.auth.userName;
export const selectUserID = (state) => state.auth.userID;
export const selectAdminStats = (state) => state.auth.adminStats;

export default authSlice.reducer;