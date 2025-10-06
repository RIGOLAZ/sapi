import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { usePiAuth } from '../hooks/usePiAuth';
import { usePiPayment } from '../hooks/usePiPayment';

const PiContext = createContext();

const piReducer = (state, action) => {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_AUTH_STATUS':
            return { ...state, isAuthenticated: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_PAYMENT_STATUS':
            return { ...state, paymentStatus: action.payload };
        default:
            return state;
    }
};

const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    paymentStatus: 'idle'
};

export const PiProvider = ({ children }) => {
    const [state, dispatch] = useReducer(piReducer, initialState);
    
    const auth = usePiAuth();
    const payment = usePiPayment();

    // Synchroniser avec le hook d'auth
    useEffect(() => {
        dispatch({ type: 'SET_USER', payload: auth.piUser });
        dispatch({ type: 'SET_AUTH_STATUS', payload: auth.isAuthenticated });
        dispatch({ type: 'SET_LOADING', payload: auth.isLoading });
        dispatch({ type: 'SET_ERROR', payload: auth.error });
    }, [auth.piUser, auth.isAuthenticated, auth.isLoading, auth.error]);

    const value = {
        ...state,
        ...auth,
        ...payment,
        // Méthodes combinées
        login: auth.authenticatePi,
        logout: auth.logoutPi,
        makePayment: payment.initiatePayment
    };

    return (
        <PiContext.Provider value={value}>
            {children}
        </PiContext.Provider>
    );
};

export const usePi = () => {
    const context = useContext(PiContext);
    if (!context) {
        throw new Error('usePi must be used within a PiProvider');
    }
    return context;
};