// functions/index.js
const functions = require("firebase-functions");
const axios     = require("axios");

// Récupération des clés stockées dans Firebase Config
const PI_KEY  = process.env.PI_KEY;
const PI_API = 'https://api.minepi.com/v2';
const HEADERS = { headers: { Authorization: `Key ${PI_KEY}` } };

// ---------- 1) Créer la facture Pi ----------
exports.createPiPayment = functions.https.onCall(async (data, context) => {
  // Sécurité : appel authentifié (facultatif, tu peux l’enlever)
  // if (!context.auth && !functions.config().pinetwork?.bypassauth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  // }

  const { amount, memo, orderId } = data;
  const body = {
    amount,
    memo,
    metadata: { orderId },
    expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
  };

  try {
    const { data: payment } = await axios.post(`${PI_API}/payments`, body, HEADERS);
    return { paymentId: payment.identifier, tx_url: payment.transaction_url };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.response?.data || err.message);
  }
});

// ---------- 2) Vérifier le paiement ----------
exports.verifyPiPayment = functions.https.onCall(async (data) => {
  const { paymentId } = data;
  try {
    const { data: payment } = await axios.get(`${PI_API}/payments/${paymentId}`, HEADERS);
    return { ok: payment.status?.transaction_verified === true };
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.response?.data || err.message);
  }
});
