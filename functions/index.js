// functions/index.js  (ES modules)
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";

initializeApp();
const db = getFirestore();
const PI_API_KEY = defineSecret("PI_API_KEY");

const pi = axios.create({
  baseURL: "https://api.minepi.com/v2",
  timeout: 15000
});

const piHeaders = (key) => ({
  "Content-Type": "application/json",
  Authorization: `Key ${key}`
});

/* ==========  CREATE PAYMENT  ========== */
export const createPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    console.log(">>> FUNCTION ENTERED", JSON.stringify(request.data));

    const { amount, memo, orderId, piUid } = request.data;
    if (typeof amount !== "number" || amount <= 0 || !memo || !orderId || !piUid)
      throw new HttpsError("invalid-argument", "amount, memo, orderId, piUid required");

    // LOG de contrôle
    console.log(">>> piUid reçu :", piUid);

    // construction corps officiel
    const payload = {
      amount: Number(amount).toFixed(5).toString(), // 5 décimales + string
      memo: memo.slice(0, 50), // 50 car max
      metadata: { orderId },
      uid: piUid // ← UID Pi Network
    };

    // ➜  LOGS BRUTS
    console.log(">>> RAW Pi request body", JSON.stringify(payload, null, 2));
    console.log(">>> RAW headers", JSON.stringify(piHeaders(PI_API_KEY.value()), null, 2));

    try {
      const { data } = await pi.post("/payments", payload, {
        headers: piHeaders(PI_API_KEY.value())
      });

      console.log("<<< Pi response", JSON.stringify(data, null, 2));

      await db.collection("pi_payments").doc(data.identifier).set({
        orderId,
        amount: payload.amount,
        memo,
        status: "pending",
        createdAt: new Date()
      });

      return { paymentId: data.identifier, tx_url: data.transaction_url };
    } catch (err) {
      const details = err.response?.data || err.message;
      console.error("!!! Pi API error", JSON.stringify(details, null, 2));
      throw new HttpsError("internal", JSON.stringify(details));
    }
  }
);

/* ==========  VERIFY PAYMENT  ========== */
export const verifyPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    const { paymentId, orderId } = request.data;
    if (!paymentId || !orderId)
      throw new HttpsError("invalid-argument", "paymentId & orderId required");

    try {
      const { data } = await pi.get(`/payments/${paymentId}`, {
        headers: piHeaders(PI_API_KEY.value())
      });
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
      console.error("verifyPiPayment >", err.response?.data || err.message);
      return { ok: false };
    }
  }
);