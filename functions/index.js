// Remplacez votre index.js par :

import { onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PiNetwork } from "@pi-network/pi-nodejs";
import { defineSecret } from "firebase-functions/params";

initializeApp();
const db = getFirestore();
const piKey = defineSecret("PI_API_KEY");

// Initialisation différée de PiNetwork
let pi;
const getPi = () => {
  if (!pi && piKey.value()) {
    pi = new PiNetwork(piKey.value());
  }
  return pi;
};

export const createPiPayment = onCall(
  { 
    secrets: [piKey], 
    region: "us-central1",
    cors: true // Active CORS
  },
  async (request) => {
    try {
      const { amount, memo, orderId } = request.data;
      
      if (!amount || !memo || !orderId) {
        throw new Error("Missing required fields: amount, memo, orderId");
      }

      const piInstance = getPi();
      if (!piInstance) {
        throw new Error("Pi Network not initialized");
      }

      const paymentData = { 
        amount, 
        memo, 
        metadata: { orderId },
        orderId 
      };
      
      const { paymentId, tx_url } = await piInstance.createPayment(paymentData);

      await db.collection("pi_payments").doc(paymentId).set({
        orderId,
        amount,
        memo,
        status: "pending",
        createdAt: new Date()
      });

      return { paymentId, tx_url };
      
    } catch (error) {
      console.error("Create payment error:", error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }
);

export const verifyPiPayment = onCall(
  { 
    secrets: [piKey], 
    region: "us-central1",
    cors: true
  },
  async (request) => {
    try {
      const { paymentId, orderId } = request.data;
      
      if (!paymentId || !orderId) {
        throw new Error("Missing paymentId or orderId");
      }

      const piInstance = getPi();
      if (!piInstance) {
        throw new Error("Pi Network not initialized");
      }

      const payment = await piInstance.getPayment(paymentId);
      
      if (!payment?.transaction) {
        return { ok: false, reason: "No transaction found" };
      }

      await db.collection("pi_payments").doc(paymentId).update({
        status: "paid",
        completedAt: new Date(),
        transaction: payment.transaction
      });

      return { ok: true };
      
    } catch (error) {
      console.error("Verify payment error:", error);
      return { ok: false, reason: error.message };
    }
  }
);