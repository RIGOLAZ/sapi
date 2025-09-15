// functions/index.js
import { initializeApp } from 'firebase/app';
const app = initializeApp(firebaseConfig);
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { v4: uuid } = require("uuid");   // npm i uuid
admin.initializeApp();
const db = admin.firestore();

const SANDBOX_URL = "https://sandbox.minepi.com/v2/payments";

exports.createPiPayment = functions
  .https.onCall(async (data) => {          // PAS de context.auth
    const { orderId, amountPi, memo, clientUid } = data; // clientUid optionnel
    if (!orderId || !amountPi || amountPi <= 0)
      throw new functions.https.HttpsError("invalid-argument", "Bad args");

    const amountMicro = String(Math.round(amountPi * 1e12));
    const tempUid = clientUid || uuid();   // uid temporaire si non loggé

    try {
      const { data: res } = await axios.post(
        SANDBOX_URL,
        {
          amount: amountMicro,
          memo,
          metadata: { orderId, uid: tempUid },
          redirect_url: `https://etralishop.com/shop/pi/success?orderId=${orderId}`,
          cancel_url: `https://etralishop.com/shop/pi/cancel?orderId=${orderId}`
        },
        { headers: { Authorization: "Key sandbox" } }
      );

      // on écrit dans une collection "orders" (pas sous users/{uid})
      await db.collection("orders").doc(orderId).set({
        paymentId: res.identifier,
        status: "pending",
        amountPi,
        memo,
        uid: tempUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { paymentId: res.identifier, qrData: `pi://payment?paymentId=${res.identifier}` };
    } catch (e) {
      console.error(e.response?.data || e.message);
      throw new functions.https.HttpsError("internal", "Sandbox error");
    }
  });

// Webhook identique
exports.piWebhook = functions.https.onRequest(async (req, res) => {
  const { payment, event } = req.body;
  if (event?.type === "payment_completed") {
    const { orderId, uid } = payment.metadata;
    await db.collection("orders").doc(orderId).update({
      status: "completed",
      txid: payment.transaction?.txid
    });
  }
  res.status(200).send("OK");
});