// Remplacez votre index.js par :

// 1. Imports
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";

// 2. Init Firebase
initializeApp();
const db = getFirestore();

// 3. Secret
const PI_API_KEY = defineSecret("PI_API_KEY");

// 4. Client REST Pi Network
const pi = axios.create({
  baseURL: "https://api.minepi.com/v2",
  timeout: 10000
});

// 5. Helper : headers avec clé
const piHeaders = (key) => ({
  "Content-Type": "application/json",
  "Authorization": `Key ${key}`
});

// ===============  CREATE PAYMENT  ===============
export const createPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    const { amount, memo, orderId } = request.data;

    if (typeof amount !== "number" || amount <= 0 || !memo || !orderId) {
      throw new HttpsError("invalid-argument", "amount, memo et orderId requis");
    }

    try {
      // appel serveur → serveur
      const { data } = await pi.post(
        "/payments",
        { amount, memo, metadata: { orderId } },
        { headers: piHeaders(PI_API_KEY.value()) }
      );

      // on stocke
      await db.collection("pi_payments").doc(data.identifier).set({
        orderId,
        amount,
        memo,
        status: "pending",
        createdAt: new Date()
      });

      return { paymentId: data.identifier, tx_url: data.transaction_url };
    } catch (err) {
      console.error("createPiPayment > axios error :", err.response?.data || err.message);
      throw new HttpsError("internal", "Impossible de créer le paiement");
    }
  }
);

// ===============  VERIFY PAYMENT  ===============
export const verifyPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    const { paymentId, orderId } = request.data;
    if (!paymentId || !orderId) {
      throw new HttpsError("invalid-argument", "paymentId et orderId requis");
    }

    try {
      const { data } = await pi.get(
        `/payments/${paymentId}`,
        { headers: piHeaders(PI_API_KEY.value()) }
      );

      // Le paiement est-il finalisé ?
      const ok = data.status === "completed" && data.transaction?.txid;
      if (ok) {
        await db.collection("pi_payments").doc(paymentId).update({
          status: "paid",
          completedAt: new Date(),
          transaction: data.transaction
        });
      }
      return { ok };
    } catch (err) {
      console.error("verifyPiPayment > axios error :", err.response?.data || err.message);
      return { ok: false };
    }
  }
);