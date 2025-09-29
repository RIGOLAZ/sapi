/// piNetwork.service.js
import { 
    getAuth,
} from './firebase-auth.js';
import { 
    doc, 
    setDoc, 
    updateDoc,
    getDoc,
    serverTimestamp,
    getFirestore
} from './firebase-config.js';

class PiNetworkPayment {
    constructor() {
        this.pi = window.Pi;
        this.initialized = false;
        this.auth = getAuth();
        this.db = getFirestore();
    }

    async init() {
        if (!window.Pi) {
            throw new Error('Pi SDK non chargé');
        }
        
        try {
            await this.pi.init({ 
                version: "2.0", 
                sandbox: process.env.NODE_ENV === 'development' 
            });
            this.initialized = true;
            console.log("✅ Pi Network SDK initialisé");
        } catch (error) {
            console.error("❌ Erreur initialisation Pi:", error);
            throw error;
        }
    }

    // 🎯 PROCESSUS PRINCIPAL CORRECT
    async startPaymentProcess(cart, totalAmount, orderId) {
        if (!this.initialized) {
            await this.init();
        }

        const user = this.auth.currentUser;
        if (!user) {
            throw new Error("Utilisateur non connecté");
        }

        // 🎯 ÉTAPE 1: Configurer les callbacks FIRST
        this.setupPiCallbacks(orderId, totalAmount, user.uid, cart);

        // 🎯 ÉTAPE 2: Créer le paiement AFTER
        const paymentData = {
            amount: totalAmount,
            memo: `Achat de ${cart.items.length} produit(s) - SAPI Store`,
            metadata: { 
                orderId: orderId,
                userId: user.uid,
                cartItems: cart.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            }
        };

        console.log("🎯 Création du paiement Pi...");
        const payment = await this.pi.createPayment(paymentData);
        
        return payment;
    }

    // 🎯 CONFIGURATION DES CALLBACKS PI
    setupPiCallbacks(orderId, amount, userId, cart) {
        const pi = this.pi;

        // ✅ CALLBACK 1: Approbation côté serveur
        pi.onReadyForServerApproval(async (paymentId) => {
            console.log("📞 Étape 2: Appel serveur d'approbation", paymentId);
            
            try {
                // Appel Cloud Function Firebase
                const approvalResult = await this.callServerApproval(paymentId, orderId, amount, userId);
                
                if (approvalResult.success) {
                    console.log("✅ Paiement approuvé côté serveur");
                    
                    // Enregistrer dans Firestore
                    await this.recordPaymentApproval(paymentId, orderId, userId, amount, cart);
                } else {
                    await pi.cancelPayment(paymentId);
                    throw new Error("Échec approbation serveur");
                }
            } catch (error) {
                console.error("❌ Erreur approbation:", error);
                await pi.cancelPayment(paymentId);
                await this.handlePaymentFailure(orderId, error.message);
            }
        });

        // ✅ CALLBACK 2: Complétion côté serveur
        pi.onReadyForServerCompletion(async (paymentId, txid) => {
            console.log("📞 Étape 3: Appel serveur de complétion", paymentId, txid);
            
            try {
                // Appel Cloud Function Firebase
                const completionResult = await this.callServerCompletion(paymentId, txid, orderId, userId);
                
                if (completionResult.success) {
                    // ✅ SEULEMENT APRÈS validation serveur
                    await pi.completePayment(paymentId, txid);
                    console.log("✅ Paiement complété avec succès");
                    
                    await this.handlePaymentSuccess(orderId, paymentId, txid, cart);
                } else {
                    await pi.cancelPayment(paymentId);
                    throw new Error("Échec complétion serveur");
                }
            } catch (error) {
                console.error("❌ Erreur complétion:", error);
                await pi.cancelPayment(paymentId);
                await this.handlePaymentFailure(orderId, error.message);
            }
        });

        // ✅ CALLBACK 3: Annulation utilisateur
        pi.onCancel(async (paymentId) => {
            console.log("❌ Paiement annulé par l'utilisateur");
            await this.handlePaymentCancellation(orderId, paymentId);
        });

        // ✅ CALLBACK 4: Erreurs SDK
        pi.onError(async (error, payment) => {
            console.error("❌ Erreur Pi SDK:", error);
            await this.handlePaymentFailure(orderId, error.message);
        });
    }

    // 🚨 APPELS CLOUD FUNCTIONS
    async callServerApproval(paymentId, orderId, amount, userId) {
        try {
            const idToken = await this.auth.currentUser.getIdToken();
            
            const response = await fetch('/api/approvePayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    paymentId,
                    orderId,
                    amount,
                    userId,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur appel approval:', error);
            throw error;
        }
    }

    async callServerCompletion(paymentId, txid, orderId, userId) {
        try {
            const idToken = await this.auth.currentUser.getIdToken();
            
            const response = await fetch('/api/completePayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    paymentId,
                    txid,
                    orderId,
                    userId,
                    validateOnChain: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur appel completion:', error);
            throw error;
        }
    }

    // 💾 OPÉRATIONS FIRESTORE
    async recordPaymentApproval(paymentId, orderId, userId, amount, cart) {
        const paymentData = {
            paymentId,
            orderId,
            userId,
            amount,
            items: cart.items,
            status: 'approved',
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(doc(this.db, 'payments', paymentId), paymentData);
    }

    async handlePaymentSuccess(orderId, paymentId, txid, cart) {
        try {
            // Mettre à jour la commande
            await updateDoc(doc(this.db, 'orders', orderId), {
                status: 'completed',
                piPaymentId: paymentId,
                piTransactionId: txid,
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Mettre à jour le paiement
            await updateDoc(doc(this.db, 'payments', paymentId), {
                status: 'completed',
                txid: txid,
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Mettre à jour le stock
            await this.updateProductStock(cart.items);

            console.log("✅ Commande complétée avec succès");

        } catch (error) {
            console.error("❌ Erreur traitement succès:", error);
            throw error;
        }
    }

    async handlePaymentFailure(orderId, errorMessage) {
        await updateDoc(doc(this.db, 'orders', orderId), {
            status: 'failed',
            error: errorMessage,
            updatedAt: serverTimestamp()
        });
    }

    async handlePaymentCancellation(orderId, paymentId) {
        try {
            const batch = this.db.batch();
            
            const orderRef = doc(this.db, 'orders', orderId);
            batch.update(orderRef, {
                status: 'cancelled',
                updatedAt: serverTimestamp()
            });

            if (paymentId) {
                const paymentRef = doc(this.db, 'payments', paymentId);
                batch.update(paymentRef, {
                    status: 'cancelled',
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();
            console.log("✅ Annulation enregistrée");
        } catch (error) {
            console.error("❌ Erreur lors de l'annulation:", error);
        }
    }

    async updateProductStock(items) {
        try {
            const batch = this.db.batch();
            
            for (const item of items) {
                const productRef = doc(this.db, 'products', item.id);
                
                // Récupérer le stock actuel
                const productDoc = await getDoc(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    const newStock = Math.max(0, currentStock - item.quantity);
                    
                    batch.update(productRef, {
                        stock: newStock,
                        updatedAt: serverTimestamp()
                    });
                } else {
                    console.warn(`⚠️ Produit ${item.id} non trouvé`);
                }
            }

            await batch.commit();
            console.log("✅ Stock mis à jour");
        } catch (error) {
            console.error("❌ Erreur mise à jour stock:", error);
            throw error;
        }
    }

    // Méthode utilitaire pour vérifier si on est dans Pi Browser
    isPiBrowser() {
        if (typeof window === 'undefined') return false;
        
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('pi browser') || 
               userAgent.includes('minepi') ||
               !!window.Pi;
    }

    // Méthode pour récupérer le statut d'un paiement
    async getPaymentStatus(paymentId) {
        try {
            const paymentDoc = await getDoc(doc(this.db, 'payments', paymentId));
            if (paymentDoc.exists()) {
                return paymentDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Erreur récupération statut paiement:', error);
            return null;
        }
    }

    // Méthode pour récupérer une commande
    async getOrder(orderId) {
        try {
            const orderDoc = await getDoc(doc(this.db, 'orders', orderId));
            if (orderDoc.exists()) {
                return orderDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Erreur récupération commande:', error);
            return null;
        }
    }
}

export const piNetwork = new PiNetworkPayment();