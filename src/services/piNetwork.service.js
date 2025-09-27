// PiNetworkService.js

class PiNetworkService {
  constructor() {
    this.Pi = window.Pi;
    this.isInitialized = false;
  }

  isPiBrowser() {
    return typeof window !== 'undefined' && !!window.Pi;
  }

  async init() {
    if (this.isInitialized) return;
    
    if (!this.Pi) {
      throw new Error('Pi SDK non disponible. Assurez-vous d\'être dans le navigateur Pi.');
    }

    try {
      // Initialisation avec les bonnes permissions
      await this.Pi.init({ 
        version: "2.0",
        sandbox: true // Changez à false pour la production
      });
      this.isInitialized = true;
      console.log('Pi SDK initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du Pi SDK:', error);
      throw error;
    }
  }

  async authenticate() {
    await this.init();
    
    // callback OBLIGATOIRE pour éviter l'erreur « every »
    const onIncompletePaymentFound = (payment) => {
      console.log('Incomplete payment found:', payment);
      return Promise.resolve(); // doit renvoyer une Promise
    };

    try {
      // Cette ligne va déclencher l'écran d'autorisation Pi Network
      const authResult = await this.Pi.authenticate(['payments', 'username'], onIncompletePaymentFound);
      console.log('Authentification Pi Network réussie:', authResult);
      return authResult;
    } catch (error) {
      console.error('Erreur d\'authentification Pi Network:', error);
      throw error;
    }
  }

  async createPayment(amount, memo, metadata = {}) {
    await this.init();

    const safeMeta = {
      ...metadata,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.Pi.createPayment(
        {
          amount,
          memo,
          metadata: safeMeta
        },
        {
          onReadyForServerApproval: (paymentId) =>
            this.approvePaymentOnServer(paymentId).catch(reject),
          onReadyForServerCompletion: (paymentId, txid) =>
            this.completePaymentOnServer(paymentId, txid)
              .then(resolve)
              .catch(reject),
          onCancel: (paymentId) => {
            console.log('Paiement annulé:', paymentId);
            reject(new Error('Paiement annulé par l\'utilisateur'));
          },
          onError: (error, payment) => {
            console.error('Erreur de paiement:', error, payment);
            reject(new Error(`Erreur de paiement: ${error.message}`));
          }
        }
      );
    });
  }

  /* ----------  CLOUD FUNCTIONS  ---------- */
  async approvePaymentOnServer(paymentId) {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const fn = httpsCallable(getFunctions(), 'approvePiPayment');
    const { data } = await fn({ paymentId });
    return data;
  }

  async completePaymentOnServer(paymentId, txid) {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const fn = httpsCallable(getFunctions(), 'completePiPayment');
    const { data } = await fn({ paymentId, txid });
    return data;
  }
}

export default new PiNetworkService();