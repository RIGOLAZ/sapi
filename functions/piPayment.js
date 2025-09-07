const functions = require('firebase-functions');
const axios = require('axios');

// Configuration Pi Network
const PI_API_KEY = functions.config().pi_network.api_key;
const PI_NETWORK_URL = 'https://api.minepi.com/v2';

// Cloud Function pour approbation
exports.approvePiPayment = functions.https.onCall(async (data, context) => {
  try {
    const { paymentId } = data;
    
    // Vérifier l'authentification (optionnel mais recommandé)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
    }
    
    // Récupérer les détails du paiement
    const paymentDetails = await axios.get(
      `${PI_NETWORK_URL}/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const payment = paymentDetails.data;
    
    // Vérifier le statut
    if (payment.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Statut de paiement invalide');
    }
    
    // Approuver le paiement
    await axios.post(
      `${PI_NETWORK_URL}/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { success: true, message: 'Paiement approuvé' };
    
  } catch (error) {
    console.error('Erreur approbation:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de l\'approbation');
  }
});

// Cloud Function pour completion
exports.completePiPayment = functions.https.onCall(async (data, context) => {
  try {
    const { paymentId, txid } = data;
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
    }
    
    // Compléter le paiement
    await axios.post(
      `${PI_NETWORK_URL}/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Ici, vous pouvez sauvegarder la commande dans Firestore
    const orderData = {
      userId: context.auth.uid,
      paymentId: paymentId,
      txid: txid,
      status: 'completed',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('orders').add(orderData);
    
    return { success: true, orderId: orderRef.id };
    
  } catch (error) {
    console.error('Erreur completion:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la completion');
  }
});

// Cloud Function pour vérifier le solde
exports.getPiBalance = functions.https.onCall(async (data, context) => {
  try {
    const { userUid } = data;
    
    const balance = await axios.get(
      `${PI_NETWORK_URL}/me/balance`,
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { balance: balance.data };
    
  } catch (error) {
    console.error('Erreur balance:', error);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la récupération du solde');
  }
});