// Importations des fonctions Cloud Functions
import { onCall } from 'firebase-functions/v2/https';

// Importations modulaires du SDK Admin
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Autres importations
import fetch from 'node-fetch'; // Assurez-vous d'utiliser une version compatible avec ESM, ou Node.js 18+

// Initialisation de l'application Firebase Admin
initializeApp();

// Obtenir des instances modulaires des services
const auth = getAuth();
const firestore = getFirestore();

// --- Fonction pour traiter un paiement Pi et authentifier l'utilisateur ---
export const processPiPaymentAndAuth = onCall(async (data, context) => {
    const { transactionId, piUserUid, orderId, cartItems } = data;
    const piApiKey = functions.config().pi.apikey; // Assurez-vous que pi.apikey est correctement configuré via firebase functions:config:set

    if (!piApiKey) {
        throw new functions.https.HttpsError('internal', 'Missing Pi API key.');
    }

    try {
        // 1. Vérifier la transaction Pi auprès de l'API Pi
        const piTransactionResponse = await fetch(`https://api.minepi.com/v2/payments/${transactionId}`, {
            headers: { 'Authorization': `Key ${piApiKey}` }
        });
        if (!piTransactionResponse.ok) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid Pi transaction.');
        }
        const transactionDetails = await piTransactionResponse.json();
        if (transactionDetails.status !== 'succeeded' || transactionDetails.user_uid !== piUserUid) {
            throw new functions.https.HttpsError('failed-precondition', 'Transaction failed or user mismatch.');
        }

        // 2. Authentifier/Créer l'utilisateur Firebase avec l'UID Pi
        const firebaseUid = piUserUid;
        try {
            await auth.getUser(firebaseUid);
        } catch (error) {
            await auth.createUser({ uid: firebaseUid });
        }

        // 3. Créer la commande dans Firestore
        await firestore.collection('orders').doc(orderId).set({
            userId: firebaseUid,
            items: cartItems,
            totalPrice: transactionDetails.amount,
            status: 'paid',
            piTransactionId: transactionId,
            paidAt: Timestamp.now(),
        });

        // 4. Générer le Custom Token Firebase
        const customToken = await auth.createCustomToken(firebaseUid);

        return { customToken, firebaseUid, orderId, transactionDetails };
    } catch (error) {
        console.error("Erreur de la Cloud Function:", error);
        throw new functions.https.HttpsError('internal', 'Erreur interne du serveur.', error.message);
    }
});

// --- Fonction pour attribuer le rôle d'administrateur ---
export const setAdminRole = onCall(async (data, context) => {
    if (!context.auth || context.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles.');
    }
    await auth.setCustomUserClaims(data.uid, { admin: true });
    return { message: `User ${data.uid} is now an admin.` };
});
