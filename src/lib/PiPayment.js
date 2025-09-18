// src/lib/piPayment.js

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import functions from '../firebase/config'; // Assurez-vous que le chemin vers votre fichier firebase.js est correct

const auth = getAuth();
const processPiPaymentAndAuth = httpsCallable(functions, 'processPiPaymentAndAuth');

/**
 * Lance le paiement via le SDK Pi, puis déclenche la Cloud Function pour vérification et authentification.
 * @param {number} amount Le montant total à payer en Pi.
 * @param {Array<Object>} cartItems Les articles du panier.
 * @returns {Promise<Object>} Les données de la réponse de la Cloud Function.
 */
export const initiatePiPayment = async (amount, cartItems) => {
    try {
        const Pi = window.Pi;
        if (!Pi) {
            throw new Error("Pi SDK not available. Please ensure it is loaded inside the Pi Browser.");
        }

        console.log("1. Appel de Pi.authenticate...");
        const authResult = await Pi.authenticate(['username']);
        console.log("2. Authentification Pi réussie.", authResult);
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

        console.log("3. Appel de Pi.createPayment avec les données :", paymentData);
        const paymentResult = await Pi.createPayment(paymentData);
        console.log("4. Paiement Pi créé. Résultat :", paymentResult);
        const transactionId = paymentResult.transaction.txid;

        console.log("5. Appel de la Cloud Function pour vérification...");
        const verificationResult = await processPiPaymentAndAuth({ transactionId, piUserUid, orderId, cartItems });
        console.log("6. Vérification Cloud Function réussie. Résultat :", verificationResult);

        console.log("7. Connexion à Firebase avec le Custom Token...");
        await signInWithCustomToken(auth, verificationResult.data.customToken);
        console.log("8. Connexion Firebase réussie.");

        return verificationResult.data;
    } catch (error) {
        console.error("Erreur complète du processus Pi/Firebase:", error);
        throw error;
    }
};
