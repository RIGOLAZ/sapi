import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';

// Secrets Firebase (à configurer dans Firebase Console)
const piApiKey = defineSecret('PI_API_KEY');

// Endpoint d'approbation de paiement
export const approvePayment = onRequest(
  { secrets: [piApiKey], cors: true },
  async (req, res) => {
    // Configurer CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    try {
      const { paymentId, orderId } = req.body;
      
      console.log('✅ Approbation de paiement reçue:', { paymentId, orderId });

      // Appeler l'API Pi pour approuver le paiement
      const response = await axios.post(
        `https://api.minepi.com/v2/payments/${paymentId}/approve`,
        {},
        {
          headers: {
            'Authorization': `Key ${piApiKey.value()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Paiement approuvé via API Pi:', response.data);

      res.json({
        success: true,
        paymentId,
        orderId,
        piResponse: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erreur approbation paiement:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message,
        paymentId: req.body.paymentId
      });
    }
  }
);

// Endpoint de complétion de paiement
export const completePayment = onRequest(
  { secrets: [piApiKey], cors: true },
  async (req, res) => {
    // Configurer CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    try {
      const { paymentId, txid, orderId } = req.body;
      
      console.log('✅ Complétion de paiement reçue:', { paymentId, txid, orderId });

      // Appeler l'API Pi pour compléter le paiement
      const response = await axios.post(
        `https://api.minepi.com/v2/payments/${paymentId}/complete`,
        { txid },
        {
          headers: {
            'Authorization': `Key ${piApiKey.value()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Paiement complété via API Pi:', response.data);

      // Ici vous pouvez mettre à jour Firestore
      // await updateOrderStatus(orderId, 'completed');

      res.json({
        success: true,
        paymentId,
        txid,
        orderId,
        piResponse: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erreur complétion paiement:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message,
        paymentId: req.body.paymentId
      });
    }
  }
);