// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.approvePayment = functions.https.onRequest(async (req, res) => {
  const { paymentId } = req.body;
  // Vérifie le paiement, approuve côté serveur
  // Appelle l’API Pi pour approuver
  res.status(200).send({ success: true });
});

exports.completePayment = functions.https.onRequest(async (req, res) => {
  const { paymentId, txid } = req.body;
  // Vérifie la transaction, marque comme complète
  res.status(200).send({ success: true });
});