// Configuration Pi Network
export const PI_CONFIG = {
    SCOPES: ['username', 'payments', 'wallet_address'],
    API_URL: 'https://api.minepi.com/v2',
    // Autres constantes Pi Network
};

// Initialiser le SDK Pi
export const initializePiSDK = () => {
    if (window.Pi) {
        console.log('Pi SDK already initialized');
        return true;
    }
    
    // Le SDK Pi est généralement chargé via le script dans index.html
    return typeof window.Pi !== 'undefined';
};