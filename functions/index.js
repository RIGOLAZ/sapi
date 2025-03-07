/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
const functions = require("firebase-functions");
const pi = require("pi-backend");

// Configurez Pi Network avec vos clés d'API
pi.configure({apiKey: "VOTRE_CLE_API", secretKey: "VOTRE_SECRET_KEY"});

// Fonction pour créer un paiement
exports.createPayment = functions.https.onRequest(async (req, res) => {
// Autorisez les requêtes cross-origin (CORS)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Répondez aux requêtes OPTIONS (nécessaire pour CORS)
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }

  const {amount, memo, userUid} = req.body;

  try {
    const payment = await pi.createPayment({
      amount: amount,
      memo: memo,
      userUid: userUid,
    });
    res.json({success: true, paymentId: payment.identifier});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  }
});

// Fonction pour confirmer un paiement
exports.confirmPayment = functions.https.onRequest(async (req, res) => {
// Autorisez les requêtes cross-origin (CORS)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Répondez aux requêtes OPTIONS (nécessaire pour CORS)
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }

  const {paymentId} = req.body;
  try {
    const confirmation = await pi.confirmPayment(paymentId);
    res.json({success: true, confirmation});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  }
});
