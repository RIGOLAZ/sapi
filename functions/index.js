import functions from 'firebase-functions';
import admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

// Configuration CORS
const handleCors = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
};

// Fonction d'approbation - HTTP SANS authentification
export const approvePayment = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    console.log('🔄 Approbation paiement:', paymentId);

    // Récupérer la clé API Pi
    const piApiKey = process.env.PI_API_KEY || functions.config().pi.api_key;
    
    if (!piApiKey) {
      throw new Error('Clé API Pi non configurée');
    }

    console.log('🔑 Utilisation clé API Pi');
    
    // Appeler l'API Pi
    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Paiement approuvé:', paymentId);
    
    res.json({ 
      success: true, 
      data: response.data,
      paymentId
    });

  } catch (error) {
    console.error('❌ Erreur approbation:', error.response?.data || error.message);
    
    res.status(500).json({ 
      success: false,
      error: 'Payment approval failed',
      details: error.response?.data || error.message
    });
  }
});

// Fonction de complétion - HTTP SANS authentification
export const completePayment = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { paymentId, txid } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Payment ID and TXID required' });
    }

    console.log('🔄 Complétion paiement:', paymentId, txid);

    const piApiKey = process.env.PI_API_KEY || functions.config().pi.api_key;
    
    if (!piApiKey) {
      throw new Error('Clé API Pi non configurée');
    }

    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Paiement complété:', paymentId);
    
    res.json({ 
      success: true, 
      data: response.data,
      paymentId,
      txid
    });

  } catch (error) {
    console.error('❌ Erreur complétion:', error.response?.data || error.message);
    
    res.status(500).json({ 
      success: false,
      error: 'Payment completion failed',
      details: error.response?.data || error.message
    });
  }
});

// Health check
export const healthCheck = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Pi Network Payments'
  });
});