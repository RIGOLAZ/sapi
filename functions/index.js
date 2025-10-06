// functions/index.js - VERSION CORRIGÉE ES6
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

// Initialisation de l'application Firebase Admin
initializeApp();
const db = getFirestore();

// Configuration Pi Network - Utilisez vos vraies valeurs
const PI_APP_ID = process.env.PI_APP_ID || "sapi-460615d940fecab6";
const PI_APP_SECRET = process.env.PI_APP_SECRET || "0x3ttwrskfwjcloygyng30kzhx2ph6hrp3fnwt3mbunlmejffk87hqystybtjpg1";
const PI_NETWORK_API_URL = 'https://api.minepi.com/v2';

console.log('🔧 Configuration Pi Network chargée');

// Helper pour les appels API Pi Network
const piNetworkRequest = async (endpoint, method = 'GET', body = null) => {
    const url = `${PI_NETWORK_API_URL}${endpoint}`;
    
    console.log(`🌐 Appel API Pi: ${method} ${url}`);
    
    const options = {
        method,
        headers: {
            'Authorization': `Key ${PI_APP_SECRET}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Erreur API Pi Network:', error);
        throw error;
    }
};

/**
 * Fonction pour approuver un paiement Pi Network
 * Déclenchée par le callback `onReadyForServerApproval`
 */
export const approvePayment = onCall(async (request) => {
    console.log('🔔 Fonction approvePayment appelée');
    
    // ⚠️ TEMPORAIREMENT - Sans authentification pour tester
    // if (!request.auth) {
    //     throw new HttpsError('unauthenticated', 'Authentication required');
    // }

    const { paymentId, paymentData } = request.data;
    console.log('📦 Données reçues:', { paymentId });

    if (!paymentId) {
        throw new HttpsError('invalid-argument', 'Payment ID is required');
    }

    try {
        console.log('🚀 Appel API Pi Network pour approbation...');
        
        // Appeler l'API Pi pour approuver le paiement
        const approval = await piNetworkRequest(`/payments/${paymentId}/approve`, 'POST');
        console.log('✅ Approbation Pi réussie');
        
        // Enregistrer dans Firestore
        const paymentDoc = {
            paymentId,
            userId: request.auth?.uid || 'pi-user', // User ID Pi
            status: 'approved',
            amount: paymentData?.amount,
            metadata: paymentData?.metadata,
            approvedAt: new Date().toISOString(),
            orderId: paymentData?.metadata?.orderId
        };

        await db.collection('pi_payments').doc(paymentId).set(paymentDoc, { merge: true });
        console.log('💾 Paiement sauvegardé dans Firestore');

        return { 
            success: true, 
            paymentId,
            message: 'Payment approved successfully'
        };

    } catch (error) {
        console.error('❌ Erreur approbation paiement:', error);
        
        // Enregistrer l'erreur
        await db.collection('pi_payments').doc(paymentId).set({
            paymentId,
            userId: request.auth?.uid || 'pi-user',
            status: 'approval_failed',
            error: error.message,
            failedAt: new Date().toISOString()
        }, { merge: true });

        throw new HttpsError('internal', `Payment approval failed: ${error.message}`);
    }
});

/**
 * Fonction pour finaliser un paiement Pi Network
 * Déclenchée par le callback `onReadyForServerCompletion`
 */
export const completePayment = onCall(async (request) => {
    console.log('🔔 Fonction completePayment appelée');
    
    // ⚠️ TEMPORAIREMENT - Sans authentification pour tester
    // if (!request.auth) {
    //     throw new HttpsError('unauthenticated', 'Authentication required');
    // }

    const { paymentId, txid, paymentData } = request.data;
    console.log('📦 Données reçues:', { paymentId, txid });

    if (!paymentId || !txid) {
        throw new HttpsError('invalid-argument', 'Payment ID and TXID are required');
    }

    try {
        console.log('🚀 Finalisation du paiement...');
        
        // Appeler l'API Pi pour finaliser le paiement
        const completion = await piNetworkRequest(`/payments/${paymentId}/complete`, 'POST', { txid });
        console.log('✅ Paiement finalisé');

        // Mettre à jour dans Firestore
        await db.collection('pi_payments').doc(paymentId).update({
            status: 'completed',
            txid,
            completedAt: new Date().toISOString(),
            completionData: completion
        });

        return { 
            success: true, 
            paymentId,
            txid,
            message: 'Payment completed successfully'
        };

    } catch (error) {
        console.error('❌ Erreur finalisation paiement:', error);
        throw new HttpsError('internal', `Payment completion failed: ${error.message}`);
    }
});

/**
 * Fonction pour vérifier l'état d'un paiement
 */
export const getPaymentStatus = onCall(async (request) => {
    const { paymentId } = request.data;

    if (!paymentId) {
        throw new HttpsError('invalid-argument', 'Payment ID is required');
    }

    try {
        const payment = await piNetworkRequest(`/payments/${paymentId}`);
        return { payment };
    } catch (error) {
        throw new HttpsError('internal', `Failed to get payment status: ${error.message}`);
    }
});

// Fonction de santé pour tester
export const healthCheck = onCall(async (request) => {
    return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        piConfig: {
            appId: PI_APP_ID ? '✅ Défini' : '❌ Manquant',
            secret: PI_APP_SECRET ? '✅ Défini' : '❌ Manquant'
        }
    };
});