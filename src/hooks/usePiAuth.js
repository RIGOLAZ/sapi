import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // ← ajout .js

// Vérifier que Pi est disponible
const getPiSDK = () => {
    if (typeof window !== 'undefined' && window.Pi) {
        return window.Pi;
    }
    throw new Error('Pi SDK non disponible');
};

export const usePiAuth = () => {
    const [piUser, setPiUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fonction de rappel pour les paiements incomplets
    const onIncompletePaymentFound = useCallback((payment) => {
        console.warn("Paiement Pi incomplet trouvé:", payment);
        processIncompletePayment(payment);
    }, []);

    // Stocker l'utilisateur Pi dans Firebase
    const storePiUserInFirebase = useCallback(async (userData) => {
        try {
            if (userData && userData.uid) {
                await setDoc(doc(db, 'pi_users', userData.uid), {
                    ...userData,
                    lastLogin: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (err) {
            console.error("Erreur stockage utilisateur Pi:", err);
        }
    }, []);

    // Traiter les paiements incomplets
    const processIncompletePayment = useCallback(async (payment) => {
        try {
            console.log("Traitement paiement incomplet:", payment);
        } catch (err) {
            console.error("Erreur traitement paiement incomplet:", err);
        }
    }, []);

    // Fonction d'authentification Pi
    const authenticatePi = useCallback(async () => {
        const Pi = getPiSDK(); // ← CORRECTION ICI
        
        try {
            const scopes = ['username', 'payments', 'wallet_address'];
            const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
            
            setPiUser(authResult);
            setIsAuthenticated(true);
            setError(null);
            
            await storePiUserInFirebase(authResult);
            
            return authResult;
        } catch (err) {
            setError(err.message);
            setIsAuthenticated(false);
            return null;
        }
    }, [onIncompletePaymentFound, storePiUserInFirebase]);

    // Fonction de déconnexion
    const logoutPi = useCallback(() => {
        setPiUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('pi_access_token');
    }, []);

    // Vérifier l'authentification au chargement
    useEffect(() => {
        const checkExistingAuth = async () => {
            if (window.Pi) {
                try {
                    const Pi = getPiSDK();
                    const currentUser = Pi.getCurrentUser();
                    if (currentUser) {
                        setPiUser(currentUser);
                        setIsAuthenticated(true);
                    }
                } catch (err) {
                    console.error("Erreur vérification auth Pi:", err);
                }
            }
            setIsLoading(false);
        };

        checkExistingAuth();
    }, []);

    return {
        piUser,
        isAuthenticated,
        isLoading,
        error,
        authenticatePi,
        logoutPi
    };
};