// functions/index.js
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { getAuth } from 'firebase-admin/auth';

// Initialisation Firebase Admin
initializeApp();

const db = getFirestore();
const auth = getAuth();

// 🔐 Configuration Pi Network (dans les variables d'environnement Firebase)
const PI_API_KEY = process.env.PI_API_KEY;
const PI_BASE_URL = 'https://api.minepi.com/v2';

// ✅ ENDPOINT D'APPROBATION
export const approvePayment = https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { paymentId, orderId, amount } = data;

    try {
        // Appeler l'API Pi pour approuver
        const response = await fetch(`${PI_BASE_URL}/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });

        if (!response.ok) {
            throw new Error(`Pi API error: ${response.status}`);
        }

        // Enregistrer l'approbation dans Firestore
        await db.collection('payments').doc(paymentId).set({
            paymentId,
            orderId,
            userId: context.auth.uid,
            status: 'approved',
            approvedAt: new Date()
        }, { merge: true });

        return { success: true, paymentId };

    } catch (error) {
        console.error('Erreur approbation:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

// ✅ ENDPOINT DE COMPLÉTION
export const completePayment = https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { paymentId, txid, orderId } = data;

    try {
        // Valider la transaction sur la blockchain Pi
        const txValid = await validatePiTransaction(txid);
        
        if (!txValid) {
            throw new Error('Transaction Pi invalide');
        }

        // Compléter le paiement via l'API Pi
        const response = await fetch(`${PI_BASE_URL}/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ txid })
        });

        if (!response.ok) {
            throw new Error(`Pi completion error: ${response.status}`);
        }

        // Mettre à jour Firestore
        const batch = db.batch();
        
        const paymentRef = db.collection('payments').doc(paymentId);
        batch.update(paymentRef, {
            status: 'completed',
            txid: txid,
            completedAt: new Date()
        });

        const orderRef = db.collection('orders').doc(orderId);
        batch.update(orderRef, {
            status: 'completed',
            piTransactionId: txid,
            completedAt: new Date()
        });

        await batch.commit();

        return { success: true, txid };

    } catch (error) {
        console.error('Erreur complétion:', error);
        throw new https.HttpsError('internal', error.message);
    }
});

// ✅ FONCTION DE VALIDATION DES TRANSACTIONS
async function validatePiTransaction(txid) {
    try {
        // Implémentez la validation via l'API Pi Blockchain
        const response = await fetch(`https://api.minepi.com/v2/transactions/${txid}`, {
            headers: {
                'Authorization': `Key ${PI_API_KEY}`
            }
        });

        if (response.ok) {
            const transaction = await response.json();
            return transaction.status === 'completed';
        }
        
        return false;
    } catch (error) {
        console.error('Erreur validation transaction:', error);
        return false;
    }
}

// ✅ FONCTION POUR RÉCUPÉRER LES STATUTS DE PAIEMENT
export const getPaymentStatus = https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { paymentId } = data;

    try {
        const paymentDoc = await db.collection('payments').doc(paymentId).get();
        
        if (!paymentDoc.exists) {
            return { success: false, error: 'Paiement non trouvé' };
        }

        return { 
            success: true, 
            payment: paymentDoc.data() 
        };

    } catch (error) {
        console.error('Erreur récupération statut:', error);
        throw new https.HttpsError('internal', error.message);
    }
});