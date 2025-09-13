const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

const db = admin.firestore();
const PI_API_KEY = functions.config().pi_network.api_key;
const PI_APP_NAME = functions.config().pi_network.app_name || 'etralishop';

// Créer un paiement Pi Network
exports.createPiPayment = functions.https.onCall(async (data, context) => {
  const { amount, orderId, userId, memo, metadata } = data;
  
  if (!context.auth || context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Non authentifié');
  }

  try {
    // Vérifier que la commande existe et n'est pas déjà payée
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Commande non trouvée');
    }
    
    if (orderDoc.data().paymentStatus === 'paid') {
      throw new functions.https.HttpsError('failed-precondition', 'Commande déjà payée');
    }

    // Créer le paiement dans Firestore
    const paymentData = {
      amount: amount,
      orderId: orderId,
      userId: userId,
      memo: memo,
      metadata: metadata,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const paymentRef = await db.collection('pi_payments').add(paymentData);
    
    return {
      success: true,
      paymentId: paymentRef.id,
      paymentData: paymentData
    };
  } catch (error) {
    console.error('Erreur création paiement:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Approuver un paiement
exports.approvePiPayment = functions.https.onCall(async (data, context) => {
  const { paymentId, paymentIdentifier, orderId, amount } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('permission-denied', 'Non authentifié');
  }

  try {
    // Récupérer le paiement
    const paymentDoc = await db.collection('pi_payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Paiement non trouvé');
    }

    // Approuver via l'API Pi Network
    const approveResponse = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentIdentifier}/approve`,
      {},
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Mettre à jour le statut dans Firestore
    await db.collection('pi_payments').doc(paymentId).update({
      status: 'approved',
      paymentIdentifier: paymentIdentifier,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur approval:', error.response?.data || error.message);
    
    // Mettre à jour le statut d'erreur
    await db.collection('pi_payments').doc(paymentId).update({
      status: 'error',
      error: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Compléter un paiement
exports.completePiPayment = functions.https.onCall(async (data, context) => {
  const { paymentId, paymentIdentifier, txid, orderId } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('permission-denied', 'Non authentifié');
  }

  try {
    // Compléter via l'API Pi Network
    const completeResponse = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentIdentifier}/complete`,
      { txid },
      {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Mettre à jour le paiement
    const paymentUpdate = {
      status: 'completed',
      txid: txid,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('pi_payments').doc(paymentId).update(paymentUpdate);

    // Mettre à jour la commande
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'paid',
      paymentMethod: 'pi_network',
      paymentId: paymentId,
      txid: txid,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Déclencher des fonctions supplémentaires
    await handlePostPaymentTasks(orderId, paymentId);

    return { 
      success: true,
      txid: txid
    };
  } catch (error) {
    console.error('Erreur completion:', error.response?.data || error.message);
    
    await db.collection('pi_payments').doc(paymentId).update({
      status: 'error',
      error: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Annuler un paiement
exports.cancelPiPayment = functions.https.onCall(async (data, context) => {
  const { paymentId, reason } = data;
  
  if (!context.auth) {
    throw new functions.https.HttpsError('permission-denied', 'Non authentifié');
  }

  try {
    await db.collection('pi_payments').doc(paymentId).update({
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur annulation:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Tâches après paiement
async function handlePostPaymentTasks(orderId, paymentId) {
  try {
    // 1. Envoyer l'email de confirmation
    await queueEmail('order_confirmation', { orderId });
    
    // 2. Mettre à jour l'inventaire
    await updateInventory(orderId);
    
    // 3. Créer une notification
    await createNotification(orderId, 'payment_completed');
    
    // 4. Logs analytics
    await logAnalyticsEvent('purchase', {
      order_id: orderId,
      payment_id: paymentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
  } catch (error) {
    console.error('Erreur tâches post-paiement:', error);
    // Ne pas bloquer le paiement si ces tâches échouent
  }
}

// Fonctions helper
async function queueEmail(type, data) {
  return db.collection('mail').add({
    to: data.email,
    message: {
      subject: getEmailSubject(type),
      html: getEmailTemplate(type, data)
    }
  });
}

async function updateInventory(orderId) {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  const items = orderDoc.data().items || [];
  
  const batch = db.batch();
  
  for (const item of items) {
    const productRef = db.collection('products').doc(item.productId);
    batch.update(productRef, {
      stock: admin.firestore.FieldValue.increment(-item.quantity),
      sold: admin.firestore.FieldValue.increment(item.quantity)
    });
  }
  
  await batch.commit();
}

async function createNotification(orderId, type) {
  return db.collection('notifications').add({
    orderId: orderId,
    type: type,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function logAnalyticsEvent(name, params) {
  return db.collection('analytics_events').add({
    name: name,
    params: params,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Fonctions helper pour emails
function getEmailSubject(type) {
  const subjects = {
    order_confirmation: 'Confirmation de commande EtraliShop',
    payment_received: 'Paiement reçu - EtraliShop'
  };
  return subjects[type] || 'Notification EtraliShop';
}

function getEmailTemplate(type, data) {
  // Templates HTML pour les emails
  // À implémenter selon tes besoins
  return `<h1>Votre commande #${data.orderId} est confirmée</h1>`;
}