import { 
  httpsCallable,
  getFunctions,
  connectFunctionsEmulator
} from 'firebase/functions';
import { getApp } from 'firebase/app';

class PiPaymentService {
  constructor() {
    this.app = getApp();
    this.functions = getFunctions(this.app, 'us-central1');
    
    // Connecter à l'émulateur en développement
    if (process.env.NODE_ENV === 'development') {
      connectFunctionsEmulator(this.functions, 'localhost', 5001);
    }

    // Initialiser les fonctions callable
    this.approvePiPayment = httpsCallable(this.functions, 'approvePiPayment');
    this.completePiPayment = httpsCallable(this.functions, 'completePiPayment');
    this.cancelPiPayment = httpsCallable(this.functions, 'cancelPiPayment');
    this.getPiPaymentHistory = httpsCallable(this.functions, 'getPiPaymentHistory');
  }

  // Initialiser Pi SDK
  async initializePiSDK() {
    if (!window.Pi) {
      throw new Error('Pi SDK non disponible - Ouvrez dans le navigateur Pi');
    }
    
    await window.Pi.init({
      version: '2.0',
      sandbox: process.env.NODE_ENV !== 'production'
    });
  }

  // Authentifier l'utilisateur Pi
  async authenticateUser() {
    try {
      await this.initializePiSDK();
      const authResult = await window.Pi.authenticate();
      return authResult;
    } catch (error) {
      console.error('Erreur authentification Pi:', error);
      throw new Error(`Authentification échouée: ${error.message}`);
    }
  }

  // Créer un paiement complet
  async createPayment(amount, memo, metadata = {}) {
    try {
      const authResult = await this.authenticateUser();
      
      const payment = await window.Pi.createPayment({
        amount: amount,
        memo: memo,
        metadata: {
          ...metadata,
          userId: authResult.user.uid,
          userName: authResult.user.username,
          timestamp: Date.now()
        }
      }, {
        onReadyForServerApproval: async (paymentId) => {
          console.log('Paiement prêt pour approbation:', paymentId);
          try {
            const result = await this.approvePiPayment({ 
              paymentId,
              userId: authResult.user.uid
            });
            console.log('Approbation réussie:', result);
          } catch (error) {
            console.error('Erreur approbation:', error);
            throw error;
          }
        },
        
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('Paiement prêt pour completion:', paymentId, txid);
          try {
            const result = await this.completePiPayment({ 
              paymentId, 
              txid,
              userId: authResult.user.uid
            });
            console.log('Completion réussie:', result);
            return result;
          } catch (error) {
            console.error('Erreur completion:', error);
            throw error;
          }
        },
        
        onCancel: async (paymentId) => {
          console.log('Paiement annulé:', paymentId);
          try {
            await this.cancelPiPayment({ 
              paymentId,
              userId: authResult.user.uid
            });
          } catch (error) {
            console.error('Erreur annulation:', error);
          }
        },
        
        onError: (error, paymentId) => {
          console.error('Erreur paiement:', error, paymentId);
          throw new Error(`Paiement échoué: ${error.message}`);
        }
      });

      return payment;

    } catch (error) {
      console.error('Erreur création paiement:', error);
      throw error;
    }
  }

  // Obtenir l'historique des paiements
  async getPaymentHistory(limit = 50, lastPaymentId = null) {
    try {
      const result = await this.getPiPaymentHistory({ 
        limit, 
        lastPaymentId 
      });
      return result.data;
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      throw new Error(`Impossible de récupérer l'historique: ${error.message}`);
    }
  }
}

export default new PiPaymentService();