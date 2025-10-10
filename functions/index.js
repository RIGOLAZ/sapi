import functions from 'firebase-functions';
import admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

// ==================== CONFIGURATION PI NETWORK ====================

const PI_CONFIG = {
  sandbox: {
    apiKey: process.env.PI_API_KEY_SANDBOX || functions.config().pi.sandbox_key,
    baseURL: 'https://api.minepi.com'
  },
  production: {
    apiKey: process.env.PI_API_KEY || functions.config().pi.api_key,
    baseURL: 'https://api.minepi.com'
  }
};

/**
 * Détection automatique de l'environnement Pi
 * Basée sur le paymentId, les headers et les metadata
 */
const detectPiEnvironment = (paymentId, headers, metadata = {}) => {
  // 1. Header explicite
  if (headers['x-pi-environment'] === 'sandbox') return true;
  if (headers['x-pi-environment'] === 'production') return false;
  
  // 2. Metadata explicite
  if (metadata.sandbox === true) return true;
  if (metadata.sandbox === false) return false;
  
  // 3. Pattern du paymentId (les IDs sandbox ont souvent un format spécifique)
  const sandboxPatterns = [
    /^test_/i,
    /_sandbox$/i,
    /_test$/i,
    /^sb_/i
  ];
  
  if (sandboxPatterns.some(pattern => pattern.test(paymentId))) {
    return true;
  }
  
  // 4. Par défaut : production pour la sécurité
  return false;
};

/**
 * Récupère la configuration Pi selon l'environnement
 */
const getPiConfig = (isSandbox) => {
  const config = isSandbox ? PI_CONFIG.sandbox : PI_CONFIG.production;
  
  if (!config.apiKey) {
    throw new Error(
      `Clé API ${isSandbox ? 'Sandbox' : 'Production'} non configurée. ` +
      `Utilisez: firebase functions:config:set pi.${isSandbox ? 'sandbox_key' : 'api_key'}="VOTRE_CLE"`
    );
  }
  
  return config;
};

// ==================== GESTION CORS ====================

const handleCors = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-pi-environment');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Fonction d'approbation de paiement Pi
 * Gère automatiquement sandbox et production
 */
export const approvePayment = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { paymentId, paymentData = {} } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID required',
        details: 'Le paymentId doit être fourni dans le corps de la requête'
      });
    }

    // Détection automatique de l'environnement
    const isSandbox = detectPiEnvironment(paymentId, req.headers, paymentData.metadata);
    const piConfig = getPiConfig(isSandbox);
    const environment = isSandbox ? 'sandbox' : 'production';

    console.log(`🔄 Approbation paiement ${environment.toUpperCase()}:`, paymentId);
    console.log('📦 Metadata:', paymentData.metadata);

    // Appeler l'API Pi
    const response = await axios.post(
      `${piConfig.baseURL}/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          'Authorization': `Key ${piConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ Paiement ${environment} approuvé:`, paymentId);
    
    res.json({ 
      success: true, 
      data: response.data,
      paymentId,
      environment
    });

  } catch (error) {
    console.error('❌ Erreur approbation:', {
      message: error.message,
      apiError: error.response?.data,
      status: error.response?.status,
      paymentId: req.body.paymentId
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Payment approval failed',
      details: error.response?.data || error.message,
      environment: req.body.paymentData?.metadata?.sandbox ? 'sandbox' : 'production'
    });
  }
});

/**
 * Fonction de complétion de paiement Pi
 * Gère automatiquement sandbox et production
 */
export const completePayment = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { paymentId, txid, paymentData = {} } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID and TXID required',
        details: 'paymentId et txid doivent être fournis'
      });
    }

    // Détection automatique de l'environnement
    const isSandbox = detectPiEnvironment(paymentId, req.headers, paymentData.metadata);
    const piConfig = getPiConfig(isSandbox);
    const environment = isSandbox ? 'sandbox' : 'production';

    console.log(`🔄 Complétion paiement ${environment}:`, paymentId, txid);

    // Appeler l'API Pi
    const response = await axios.post(
      `${piConfig.baseURL}/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          'Authorization': `Key ${piConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    // Sauvegarde en base de données
    await admin.firestore().collection('pi_payments').doc(paymentId).set({
      paymentId,
      txid,
      environment,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      amount: paymentData.amount,
      memo: paymentData.memo,
      metadata: paymentData.metadata,
      ...response.data
    }, { merge: true });

    console.log(`✅ Paiement ${environment} complété et sauvegardé:`, paymentId);
    
    res.json({ 
      success: true, 
      data: response.data,
      paymentId,
      txid,
      environment
    });

  } catch (error) {
    console.error('❌ Erreur complétion:', {
      message: error.message,
      apiError: error.response?.data,
      status: error.response?.status,
      paymentId: req.body.paymentId,
      txid: req.body.txid
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Payment completion failed',
      details: error.response?.data || error.message,
      environment: req.body.paymentData?.metadata?.sandbox ? 'sandbox' : 'production'
    });
  }
});

/**
 * Vérification du statut d'un paiement
 */
export const getPaymentStatus = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { paymentId, paymentData = {} } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    const isSandbox = detectPiEnvironment(paymentId, req.headers, paymentData.metadata);
    const piConfig = getPiConfig(isSandbox);
    const environment = isSandbox ? 'sandbox' : 'production';

    console.log(`🔍 Vérification statut ${environment}:`, paymentId);

    const response = await axios.get(
      `${piConfig.baseURL}/v2/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Key ${piConfig.apiKey}`
        },
        timeout: 5000
      }
    );

    res.json({ 
      success: true, 
      data: response.data,
      paymentId,
      environment
    });

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error.response?.data || error.message);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to get payment status',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Health check avec vérification des configurations
 */
export const healthCheck = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firestore: true,
        pi_sandbox: false,
        pi_production: false
      },
      configurations: {
        sandbox_key: !!PI_CONFIG.sandbox.apiKey,
        production_key: !!PI_CONFIG.production.apiKey
      }
    };

    // Test Firestore
    try {
      await admin.firestore().collection('health').doc('check').get();
    } catch (error) {
      healthStatus.services.firestore = false;
      healthStatus.status = 'degraded';
    }

    // Test API Pi Sandbox
    try {
      if (PI_CONFIG.sandbox.apiKey) {
        await axios.get(`${PI_CONFIG.sandbox.baseURL}/v2/payments`, {
          headers: { 'Authorization': `Key ${PI_CONFIG.sandbox.apiKey}` },
          timeout: 5000
        });
        healthStatus.services.pi_sandbox = true;
      }
    } catch (error) {
      healthStatus.services.pi_sandbox = false;
    }

    // Test API Pi Production
    try {
      if (PI_CONFIG.production.apiKey) {
        await axios.get(`${PI_CONFIG.production.baseURL}/v2/payments`, {
          headers: { 'Authorization': `Key ${PI_CONFIG.production.apiKey}` },
          timeout: 5000
        });
        healthStatus.services.pi_production = true;
      }
    } catch (error) {
      healthStatus.services.pi_production = false;
    }

    res.status(200).json(healthStatus);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default {
  approvePayment,
  completePayment,
  getPaymentStatus,
  healthCheck
};