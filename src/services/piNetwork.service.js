class PiNetworkService {
  constructor() {
    this.Pi = window.Pi;
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.minepi.com' 
      : 'https://api.testnet.minepi.com';
  }

  // Initialise Pi SDK (comme dans la demo)
  async initialize() {
    if (!this.Pi) {
      throw new Error('Pi SDK not available');
    }
    
    await this.Pi.init({
      version: '2.0',
      sandbox: process.env.NODE_ENV !== 'production'
    });
  }

  // Authentification Pi (exactement comme demo)
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

  // Création de paiement (même flux que demo)
  async createPayment(amount, memo, metadata = {}) {
    const authResult = await this.authenticate();
    
    return new Promise((resolve, reject) => {
      this.Pi.createPayment({
        amount: amount,
        memo: memo,
        metadata: {
          ...metadata,
          userUid: authResult.user.uid,
          username: authResult.user.username,
          timestamp: Date.now()
        }
      }, {
        onReadyForServerApproval: (paymentId) => {
          console.log('✅ Server approval ready:', paymentId);
          this.approvePaymentOnServer(paymentId)
            .then(() => console.log('✅ Server approval completed'))
            .catch(err => console.error('❌ Server approval failed:', err));
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

  // Appel aux Cloud Functions (comme demo)
  async approvePaymentOnServer(paymentId) {
    const { httpsCallable } = await import('firebase/functions');
    const { getFunctions } = await import('firebase/functions');
    
    const functions = getFunctions();
    const approvePiPayment = httpsCallable(functions, 'approvePiPayment');
    
    const result = await approvePiPayment({ paymentId });
    return result.data;
  }

  async completePaymentOnServer(paymentId, txid) {
    const { httpsCallable } = await import('firebase/functions');
    const { getFunctions } = await import('firebase/functions');
    
    const functions = getFunctions();
    const completePiPayment = httpsCallable(functions, 'completePiPayment');
    
    const result = await completePiPayment({ paymentId, txid });
    return result.data;
  }

  // Vérification de la disponibilité (comme demo)
  isPiBrowser() {
    return typeof window.Pi !== 'undefined';
  }
}

export default new PiNetworkService();