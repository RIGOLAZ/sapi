// src/lib/piPayment.js

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config'; // Assurez-vous que le chemin est correct

const auth = getAuth();
const processPiPaymentAndAuth = httpsCallable(functions, 'processPiPaymentAndAuth');

/**
 * Lance le paiement via le SDK Pi, puis déclenche la Cloud Function pour vérification et authentification.
 * @param {number} amount Le montant total à payer en Pi.
 * @param {Array<Object>} cartItems Les articles du panier.
 * @returns {Promise<Object>} Les données de la réponse de la Cloud Function.
 */
export const initiatePiPayment = async (amount, cartItems) => {
  const Pi = window.Pi;
  if (!Pi) {
    throw new Error("Pi SDK non chargé – ouvrez cette page dans le Pi Browser.");
  }

  // 1. Handler obligatoire pour les paiements inachevés
  Pi.onIncompletePaymentFound(payment => {
    // tu peux soit :
    // - renvoyer le paiement à ta cloud function pour vérification
    // - ou simplement logger
    console.log("Paiement inachevé détecté :", payment);
    return true;   // indique que tu gères
  });

  // 2. Authentification
  const auth = await Pi.authenticate(['username']);
  console.log("Utilisateur Pi :", auth.user.uid);

  // 3. Création du paiement
  const orderId = `${auth.user.uid}-${Date.now()}`;
  const paymentData = {
    amount,
    memo: `Commande #${orderId}`,
    metadata: { orderId, items: cartItems }
  };

  const payment = await Pi.createPayment(paymentData);
  console.log("Paiement créé :", payment);

  // 4. Vérification côté serveur + connexion Firebase
  const verif = await processPiPaymentAndAuth({
    transactionId: payment.transaction.txid,
    piUserUid: auth.user.uid,
    orderId,
    cartItems
  });

  await signInWithCustomToken(auth, verif.data.customToken);
  return verif.data;
};
