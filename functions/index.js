import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import axios from 'axios';
import * as dotenv from "dotenv";
dotenv.config();   // charge le .env AVANT tout accès

// Initialiser Firebase directement ici
initializeApp();
const db = getFirestore();

// Ligne 8 : Ajoute une validation
const PI_API_KEY = process.env.PI_API_KEY;
const PI_SECRET = process.env.PI_SECRET;
const PI_SANDBOX = process.env.PI_SANDBOX === "true";
if (!PI_API_KEY) {
  console.warn("⚠️ PI_API_KEY non défini dans les variables d'environnement");
} else {
  console.log("Pi key loaded, length:", PI_API_KEY.length);
}

const piAxios = axios.create({
  baseURL: PI_SANDBOX ? 'https://api.testnet.minepi.com' : 'https://api.minepi.com',
  timeout: 30000,
  headers: {
    'Authorization': `Key ${PI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});


logger.info('Firebase Functions initialized with Pi Payment integration');

// 🔥 FUNCTIONS DIRECTEMENT ICI (plus simple)

/**
 * Cloud Function pour approuver un paiement
 */
export const approvePiPayment = onCall({
  region: 'us-central1',
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { paymentId } = request.data;
  const userId = request.auth.uid;

  if (!paymentId) {
    throw new HttpsError('invalid-argument', 'Payment ID requis');
  }

  try {
    logger.info(`Approbation paiement ${paymentId} pour utilisateur ${userId}`);
    
    // Récupérer les infos du paiement depuis Pi Network
    const paymentInfo = await piAxios.get(`/v2/payments/${paymentId}`);
    
    // Approuver chez Pi Network
    const approvalResponse = await piAxios.post(`/v2/payments/${paymentId}/approve`);
    
    // Sauvegarder dans Firestore
    await db.collection('piPayments').doc(paymentId).set({
      userId: userId,
      status: 'approved',
      amount: paymentInfo.data.amount,
      memo: paymentInfo.data.memo,
      metadata: paymentInfo.data.metadata || {},
      approvedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Paiement approuvé',
      data: approvalResponse.data 
    };

  } catch (error) {
    logger.error('Erreur approbation paiement:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function pour compléter un paiement
 */
export const completePiPayment = onCall({
  region: 'us-central1',
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { paymentId, txid } = request.data;
  const userId = request.auth.uid;

  if (!paymentId || !txid) {
    throw new HttpsError('invalid-argument', 'Payment ID et TXID requis');
  }

  try {
    logger.info(`Completion paiement ${paymentId} avec TX ${txid}`);
    
    // Compléter chez Pi Network
    const completionResponse = await piAxios.post(
      `/v2/payments/${paymentId}/complete`,
      { txid }
    );

    // Mettre à jour Firestore
    await db.collection('piPayments').doc(paymentId).update({
      status: 'completed',
      txid: txid,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Paiement complété avec succès',
      data: completionResponse.data 
    };

  } catch (error) {
    logger.error('Erreur completion paiement:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function pour annuler un paiement
 */
export const cancelPiPayment = onCall({
  region: 'us-central1',
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { paymentId } = request.data;
  const userId = request.auth.uid;

  if (!paymentId) {
    throw new HttpsError('invalid-argument', 'Payment ID requis');
  }

  try {
    logger.info(`Annulation paiement ${paymentId} pour utilisateur ${userId}`);
    
    // Mettre à jour le statut dans Firestore
    await db.collection('piPayments').doc(paymentId).update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Paiement annulé'
    };

  } catch (error) {
    logger.error('Erreur annulation paiement:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function pour obtenir l'historique des paiements
 */
export const getPiPaymentHistory = onCall({
  region: 'us-central1',
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const userId = request.auth.uid;
  const limit = request.data.limit || 50;

  try {
    logger.info(`Récupération historique paiements pour ${userId}`);
    
    const snapshot = await db.collection('piPayments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const payments = [];
    snapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { payments };

  } catch (error) {
    logger.error('Erreur récupération historique:', error);
    throw new HttpsError('internal', 'Erreur lors de la récupération de l\'historique');
  }
});