import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

// Initialisation Firebase Admin
initializeApp();
const db = getFirestore();

// ==================== CONFIGURATION PI NETWORK ====================

const PI_CONFIG = {
  sandbox: {
    apiKey: process.env.PI_API_KEY_SANDBOX || "votre_clé_sandbox",
    baseURL: 'https://api.minepi.com'
  },
  production: {
    apiKey: process.env.PI_API_KEY || "votre_clé_production", 
    baseURL: 'https://api.minepi.com'
  }
};

/**
 * Détection automatique de l'environnement Pi
 */
const detectPiEnvironment = (paymentId, headers, metadata = {}) => {
  // 1. Header explicite
  if (headers['x-pi-environment'] === 'sandbox') return true;
  if (headers['x-pi-environment'] === 'production') return false;
  
  // 2. Metadata explicite
  if (metadata.sandbox === true) return true;
  if (metadata.sandbox === false) return false;
  
  // 3. Pattern du paymentId
  const sandboxPatterns = [/^test_/i, /_sandbox$/i, /_test$/i, /^sb_/i];
  if (sandboxPatterns.some(pattern => pattern.test(paymentId))) {
    return true;
  }
  
  // 4. Par défaut : production
  return false;
};

/**
 * Récupère la configuration Pi selon l'environnement
 */
const getPiConfig = (isSandbox) => {
  const config = isSandbox ? PI_CONFIG.sandbox : PI_CONFIG.production;
  
  if (!config.apiKey || config.apiKey === "votre_clé_sandbox" || config.apiKey === "votre_clé_production") {
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
 */
export const approvePayment = onRequest(async (req, res) => {
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

    // Sauvegarde initiale du paiement
    await db.collection('pi_payments').doc(paymentId).set({
      paymentId,
      environment,
      status: 'approving',
      amount: paymentData.amount,
      memo: paymentData.memo,
      metadata: paymentData.metadata,
      createdAt: new Date().toISOString()
    }, { merge: true });

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

    // Mise à jour statut
    await db.collection('pi_payments').doc(paymentId).set({
      status: 'approved',
      approvedAt: new Date().toISOString(),
      ...response.data
    }, { merge: true });

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

    // Sauvegarde de l'erreur
    if (req.body.paymentId) {
      await db.collection('pi_payments').doc(req.body.paymentId).set({
        status: 'approval_failed',
        error: error.message,
        failedAt: new Date().toISOString()
      }, { merge: true });
    }
    
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
 */
export const completePayment = onRequest(async (req, res) => {
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
    await db.collection('pi_payments').doc(paymentId).set({
      paymentId,
      txid,
      environment,
      status: 'completed',
      completedAt: new Date().toISOString(),
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

    // Sauvegarde de l'erreur
    if (req.body.paymentId) {
      await db.collection('pi_payments').doc(req.body.paymentId).set({
        status: 'completion_failed',
        error: error.message,
        failedAt: new Date().toISOString()
      }, { merge: true });
    }
    
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
export const getPaymentStatus = onRequest(async (req, res) => {
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
 * Fonction pour annuler un paiement bloqué côté Pi Network
 */
export const cancelPayment = onRequest(async (req, res) => {
  // Gestion CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-pi-environment');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { paymentId, reason = "user_cancelled" } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID required'
      });
    }

    console.log('🔄 Tentative d\'annulation du paiement:', paymentId);

    // Détection de l'environnement
    const isSandbox = paymentId.includes('test') || paymentId.includes('sandbox');
    const piConfig = getPiConfig(isSandbox);
    const environment = isSandbox ? 'sandbox' : 'production';

    // 1. Récupérer le statut actuel du paiement
    const statusResponse = await axios.get(
      `${piConfig.baseURL}/v2/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Key ${piConfig.apiKey}`
        },
        timeout: 5000
      }
    );

    const paymentStatus = statusResponse.data;
    console.log('📊 Statut avant annulation:', paymentStatus.status);

    let action = 'none';
    
    // 2. Annuler le paiement selon son statut
    if (paymentStatus.status === 'pending' || paymentStatus.status === 'approved') {
      try {
        // Appeler l'API Pi pour annuler (sans stocker la réponse inutile)
        await axios.post(
          `${piConfig.baseURL}/v2/payments/${paymentId}/cancel`,
          {},
          {
            headers: {
              'Authorization': `Key ${piConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        action = 'cancelled_via_api';
        console.log('✅ Paiement annulé via API Pi:', paymentId);
        
      } catch (cancelError) {
        console.log('⚠️ Annulation API échouée, marquage comme annulé en base:', cancelError.message);
        action = 'marked_cancelled';
      }
    }

    // 3. Sauvegarder en base de données
    await db.collection('pi_payments').doc(paymentId).set({
      paymentId,
      environment,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
      cancellationAction: action,
      originalStatus: paymentStatus.status,
      amount: paymentStatus.amount,
      memo: paymentStatus.memo,
      metadata: paymentStatus.metadata
    }, { merge: true });

    // 4. Si c'est une commande, mettre à jour son statut
    if (paymentStatus.metadata?.orderId) {
      await db.collection('orders').doc(paymentStatus.metadata.orderId).set({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: `Paiement Pi annulé: ${reason}`
      }, { merge: true });
    }

    console.log(`✅ Paiement ${environment} annulé:`, paymentId);

    res.json({
      success: true,
      paymentId,
      environment,
      originalStatus: paymentStatus.status,
      action: action,
      message: 'Paiement annulé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur annulation:', {
      message: error.message,
      apiError: error.response?.data,
      paymentId: req.body.paymentId
    });

    res.status(500).json({
      success: false,
      error: 'Cancellation failed',
      details: error.response?.data || error.message,
      paymentId: req.body.paymentId
    });
  }
});

/**
 * Health check avec vérification des configurations
 */
export const healthCheck = onRequest(async (req, res) => {
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
        sandbox_key: !!PI_CONFIG.sandbox.apiKey && PI_CONFIG.sandbox.apiKey !== "votre_clé_sandbox",
        production_key: !!PI_CONFIG.production.apiKey && PI_CONFIG.production.apiKey !== "votre_clé_production"
      }
    };

    // Test Firestore
    try {
      await db.collection('health').doc('check').get();
    } catch (error) {
      healthStatus.services.firestore = false;
      healthStatus.status = 'degraded';
    }

    // Test API Pi Sandbox
    try {
      if (healthStatus.configurations.sandbox_key) {
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
      if (healthStatus.configurations.production_key) {
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

/**
 * Fonction pour récupérer les paiements bloqués
 */
export const fixStuckPayment = onRequest(async (req, res) => {
  // Gestion CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-pi-environment');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { paymentId, forceEnvironment } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    const environment = forceEnvironment || (paymentId.includes('test') ? 'sandbox' : 'production');
    const isSandbox = environment === 'sandbox';
    const piConfig = getPiConfig(isSandbox);

    console.log(`🔧 Correction paiement ${environment}:`, paymentId);

    // 1. Récupérer le statut actuel
    const statusResponse = await axios.get(
      `${piConfig.baseURL}/v2/payments/${paymentId}`,
      {
        headers: { 'Authorization': `Key ${piConfig.apiKey}` }
      }
    );

    const paymentStatus = statusResponse.data;
    console.log('📊 Statut actuel:', paymentStatus);

    // 2. Actions selon le statut
    let action = 'none';
    
    if (paymentStatus.status === 'pending') {
      // Si bloqué en approbation, réessayer l'approbation
      await axios.post(
        `${piConfig.baseURL}/v2/payments/${paymentId}/approve`,
        {},
        { headers: { 'Authorization': `Key ${piConfig.apiKey}` } }
      );
      action = 'reapproved';
    }

    // 3. Sauvegarder le résultat
    await db.collection('payment_recovery').doc(paymentId).set({
      paymentId,
      originalStatus: paymentStatus.status,
      actionTaken: action,
      recoveredAt: new Date().toISOString(),
      environment
    });

    res.json({
      success: true,
      paymentId,
      originalStatus: paymentStatus.status,
      actionTaken: action,
      environment
    });

  } catch (error) {
    console.error('❌ Erreur correction:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Recovery failed',
      details: error.response?.data || error.message
    });
  }
});