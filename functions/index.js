// firebase/functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// --- Fonction pour traiter un paiement Pi et authentifier l'utilisateur ---
exports.processPiPaymentAndAuth = functions.https.onCall(async (data, context) => {
    const { transactionId, piUserUid, orderId, cartItems } = data;
    const piApiKey = functions.config().pi.apikey;

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
            await admin.auth().getUser(firebaseUid);
        } catch (error) {
            await admin.auth().createUser({ uid: firebaseUid });
        }

        // 3. Créer la commande dans Firestore
        await admin.firestore().collection('orders').doc(orderId).set({
            userId: firebaseUid,
            items: cartItems,
            totalPrice: transactionDetails.amount,
            status: 'paid',
            piTransactionId: transactionId,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Générer le Custom Token Firebase
        const customToken = await admin.auth().createCustomToken(firebaseUid);

        return { customToken, firebaseUid, orderId, transactionDetails };
    } catch (error) {
        console.error("Erreur de la Cloud Function:", error);
        throw new functions.https.HttpsError('internal', 'Erreur interne du serveur.', error.message);
    }
});

// --- Fonction pour attribuer le rôle d'administrateur ---
exports.setAdminRole = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles.');
    }
    await admin.auth().setCustomUserClaims(data.uid, { admin: true });
    return { message: `User ${data.uid} is now an admin.` };
});
