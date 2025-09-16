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

export const createPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    const { amount, memo, orderId } = request.data;
    if (typeof amount !== "number" || amount <= 0 || !memo || !orderId)
      throw new HttpsError("invalid-argument", "amount, memo, orderId required");

    const payload = {
      amount,
      memo,
      metadata: { orderId },
      uid: ""                       // obligatoire même vide
    };

    try {
      console.log(">>> Pi payload", JSON.stringify(payload));   // ← log
      const { data } = await pi.post("/payments", payload, {
        headers: piHeaders(PI_API_KEY.value())
      });
      console.log("<<< Pi response", JSON.stringify(data));      // ← log

      await db.collection("pi_payments").doc(data.identifier).set({
        orderId,
        amount,
        memo,
        status: "pending",
        createdAt: new Date()
      });

      return { paymentId: data.identifier, tx_url: data.transaction_url };
    } catch (err) {
      // on renvoie le vrai message de Pi au front
      const reply = err.response?.data || err.message;
      console.error("!!! Pi API error", JSON.stringify(reply));  // ← log
      throw new HttpsError("internal", JSON.stringify(reply));
    }
  }
);