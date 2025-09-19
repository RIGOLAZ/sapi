<<<<<<< HEAD
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
=======
// functions/index.js  (CommonJS)
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
admin.initializeApp();
const db = admin.firestore();

const SANDBOX_URL = "https://sandbox.minepi.com/v2/payments";

exports.createPiPayment = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");
    const { orderId, amountPi, memo } = data;
    if (!orderId || !amountPi || amountPi <= 0)
      throw new functions.https.HttpsError("invalid-argument", "Bad args");
>>>>>>> 353adfc (Reverse)

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
<<<<<<< HEAD
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
=======
      const { data: res } = await axios.post(
        SANDBOX_URL,
        {
          amount: amountMicro,
          memo,
          metadata: { orderId, uid: context.auth.uid },
          redirect_url: `https://etralishop.com/shop/pi/success?orderId=${orderId}`,
          cancel_url: `https://etralishop.com/shop/pi/cancel?orderId=${orderId}`
        },
        { headers: { Authorization: "Key sandbox" } }
      );

      await db.collection("users").doc(context.auth.uid)
              .collection("orders").doc(orderId)
              .update({ paymentId: res.identifier, status: "pending" });

      return { paymentId: res.identifier, qrData: `pi://payment?paymentId=${res.identifier}` };
    } catch (e) {
      console.error(e.response?.data || e.message);
      throw new functions.https.HttpsError("internal", "Sandbox error");
>>>>>>> 353adfc (Reverse)
    }
});

<<<<<<< HEAD
// --- Fonction pour attribuer le rôle d'administrateur ---
export const setAdminRole = onCall(async (data, context) => {
    if (!context.auth || context.auth.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles.');
    }
    await auth.setCustomUserClaims(data.uid, { admin: true });
    return { message: `User ${data.uid} is now an admin.` };
});
=======
// Webhook sandbox (pas signé)
exports.piWebhook = functions.https.onRequest(async (req, res) => {
  const { payment, event } = req.body;
  if (event?.type === "payment_completed") {
    const { orderId, uid } = payment.metadata;
    await db.collection("users").doc(uid)
            .collection("orders").doc(orderId)
            .update({ status: "completed", txid: payment.transaction?.txid });
  }
  res.status(200).send("OK");
});
>>>>>>> 353adfc (Reverse)
