// src/lib/piPayment.js

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config'; // Assurez-vous que le chemin est correct

const auth = getAuth();
const processPiPaymentAndAuth = httpsCallable(functions, 'processPiPaymentAndAuth');

// --- Fonction de paiement ---
export const initiatePiPayment = async (amount, cartItems) => {
    try {
        // Accéder à l'objet Pi global, initialisé via le script HTML
        const Pi = window.Pi;
        if (!Pi) {
            throw new Error("Pi SDK not available. Please ensure it is loaded.");
        }

        const authResult = await Pi.authenticate(['username']);
        const piUserUid = authResult.user.uid;

        const orderId = `${piUserUid}-${new Date().getTime()}`;

        const paymentData = {
            amount: amount,
            memo: `Paiement pour commande #${orderId}`,
            metadata: {
                orderId: orderId,
                items: cartItems
            }
        };

        const paymentResult = await Pi.createPayment(paymentData);
        const transactionId = paymentResult.transaction.txid;

        const verificationResult = await processPiPaymentAndAuth({ transactionId, piUserUid, orderId, cartItems });

        await signInWithCustomToken(auth, verificationResult.data.customToken);

        return verificationResult.data;
    } catch (error) {
        console.error("Erreur du processus Pi/Firebase:", error);
        throw error;
    }
};