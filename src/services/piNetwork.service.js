class PiNetworkService {
  constructor() {
    this.Pi = window.Pi;
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.minepi.com'
      : 'https://api.testnet.minepi.com';
  }

  // Initialise Pi SDK
  async initialize() {
    if (!this.Pi) {
      throw new Error('Pi SDK not available');
    }
    
    await this.Pi.init({
  version: '2.0',
  sandbox: true   // ← force sandbox pour shop.etralis.com
});
  }

  // Authentification Pi
  async authenticate() {
    try {
      await this.initialize();
      const authResult = await this.Pi.authenticate();
      return authResult;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // 🔥 CRÉATION DE PAIEMENT (corrigée et sécurisée)
  async createPayment(amount, memo, metadata = {}) {
    const authResult = await this.authenticate();
    
    // ✅ VÉRIFICATIONS ANTI-ERREUR
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    if (!memo) {
      throw new Error('Memo is required');
    }

    // ✅ SÉCURISER LES DONNÉES (anti 'every' error)
    const safeMetadata = {
      ...metadata,
      userUid: authResult.user.uid,
      username: authResult.user.username,
      timestamp: Date.now(),
      items: Array.isArray(metadata.items) ? metadata.items : [],
      itemsCount: metadata.items?.length || 0,
      totalAmount: metadata.totalAmount || amount
    };

    return new Promise((resolve, reject) => {
      this.Pi.createPayment({
        amount: amount,
        memo: memo,
        metadata: safeMetadata
      }, {
        onReadyForServerApproval: (paymentId) => {
          console.log('✅ Server approval ready:', paymentId);
          this.approvePaymentOnServer(paymentId)
            .then(() => console.log('✅ Server approval completed'))
            .catch(err => {
              console.error('❌ Server approval failed:', err);
              reject(err);
            });
        },
        
        onReadyForServerCompletion: (paymentId, txid) => {
          console.log('✅ Server completion ready:', paymentId, txid);
          this.completePaymentOnServer(paymentId, txid)
            .then(() => {
              console.log('✅ Server completion successful');
              resolve({ paymentId, txid });
            })
            .catch(err => {
              console.error('❌ Server completion failed:', err);
              reject(err);
            });
        },
        
        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          reject(new Error('Payment cancelled by user'));
        },
        
        onError: (error, paymentId) => {
          console.error('❌ Payment error:', error, paymentId);
          reject(error);
        }
      });
    });
  }

  // Appel aux Cloud Functions
  async approvePaymentOnServer(paymentId) {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      
      const functions = getFunctions();
      const approvePiPayment = httpsCallable(functions, 'approvePiPayment');
      
      const result = await approvePiPayment({ paymentId });
      return result.data;
    } catch (error) {
      console.error('❌ Server approval error:', error);
      throw new Error(`Server approval failed: ${error.message}`);
    }
  }

  async completePaymentOnServer(paymentId, txid) {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      
      const functions = getFunctions();
      const completePiPayment = httpsCallable(functions, 'completePiPayment');
      
      const result = await completePiPayment({ paymentId, txid });
      return result.data;
    } catch (error) {
      console.error('❌ Server completion error:', error);
      throw new Error(`Server completion failed: ${error.message}`);
    }
  }
  // Vérification de la disponibilité
  isPiBrowser() {
    return typeof window.Pi !== 'undefined';
  }
}

export default new PiNetworkService();