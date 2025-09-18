// src/redux/slice/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoggedIn: false,
  email: null,
  userName: null,
  userID: null,
  previousURL: "", // Ajoutez l'état pour la sauvegarde de l'URL
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    SET_ACTIVE_USER(state, action) {
      // ... (votre code existant)
    },
    REMOVE_ACTIVE_USER(state, action) {
      // ... (votre code existant)
    },
    SAVE_URL(state, action) { // Ajoutez ce reducer
      state.previousURL = action.payload;
    },
  },
});

// Assurez-vous d'exporter la nouvelle action
export const { SET_ACTIVE_USER, REMOVE_ACTIVE_USER, SAVE_URL } = authSlice.actions;

export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectEmail = (state) => state.auth.email;
export const selectUserName = (state) => state.auth.userName;
export const selectUserID = (state) => state.auth.userID;
export const selectPreviousURL = (state) => state.auth.previousURL; // Vous pouvez aussi exporter le sélecteur pour y accéder

export default authSlice.reducer;
