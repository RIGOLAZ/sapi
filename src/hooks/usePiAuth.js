import { useState, useCallback } from 'react';

export const usePiAuth = () => {
    const [piUser, setPiUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fonction d'authentification Pi
    const authenticatePi = useCallback(async () => {
        if (!window.Pi) {
            setError('Pi Browser non détecté');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const scopes = ['username', 'payments', 'wallet_address'];
            const authResult = await window.Pi.authenticate(scopes, (payment) => {
                console.warn("Paiement Pi incomplet:", payment);
            });
            
            setPiUser(authResult.user);
            setIsAuthenticated(true);
            
            console.log('✅ Authentification Pi réussie:', authResult.user.username);
            return authResult;
            
        } catch (err) {
            setError(err.message);
            setIsAuthenticated(false);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fonction de déconnexion
    const logoutPi = useCallback(() => {
        setPiUser(null);
        setIsAuthenticated(false);
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