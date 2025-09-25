// PiNetworkService.js
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

class PiNetworkService {
  constructor() {
    this.Pi = window.Pi;
    this.baseURL = process.env.NODE_ENV === 'production'
      ? 'https://api.minepi.com'
      : 'https://api.testnet.minepi.com';
  }

  /* ----------  INIT  ---------- */
  async init() {
    if (!this.Pi) throw new Error('Pi SDK not available');
    await this.Pi.init({ version: '2.0', sandbox: true });
  }

  /* ----------  AUTH  ---------- */
  async authenticate() {
    await this.init();

    const onIncompletePaymentFound = (payment) => {
      console.log('Incomplete payment found:', payment);
      return Promise.resolve();
    };

    return this.Pi.authenticate(['payments', 'username'], onIncompletePaymentFound);
  }

  /* ----------  CREATE PAYMENT  ---------- */
  async createPayment(amount, memo, metadata = {}) {
    if (!amount || amount <= 0) throw new Error('Invalid amount');
    if (!memo) throw new Error('Memo is required');

    const auth = await this.authenticate();

    const safeMeta = {
      ...metadata,
      userUid: auth.user.uid,
      username: auth.user.username,
      timestamp: Date.now(),
      items: Array.isArray(metadata.items) ? metadata.items : [],
      itemsCount: metadata.items?.length || 0,
      totalAmount: metadata.totalAmount || amount
    };

    return new Promise((resolve, reject) => {
      this.Pi.createPayment(
        { amount, memo, metadata: safeMeta },
        {
          onReadyForServerApproval: (paymentId) =>
            this.approvePaymentOnServer(paymentId).catch(reject),

          onReadyForServerCompletion: (paymentId, txid) =>
            this.completePaymentOnServer(paymentId, txid)
              .then(() => resolve({ paymentId, txid }))
              .catch(reject),

          onCancel: (paymentId) =>
            reject(new Error(`Payment ${paymentId} cancelled by user`)),

          onError: (error, paymentId) =>
            reject(new Error(`Payment ${paymentId} error: ${error.message || error}`))
        }
      );
    });
  }

  /* ----------  CLOUD FUNCTIONS  ---------- */
  async approvePaymentOnServer(paymentId) {
    const functions = getFunctions();
    if (process.env.NODE_ENV === 'development') {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    const fn = httpsCallable(functions, 'approvePiPayment');
    const { data } = await fn({ paymentId });
    return data;
  }

  async completePaymentOnServer(paymentId, txid) {
    const functions = getFunctions();
    if (process.env.NODE_ENV === 'development') {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    const fn = httpsCallable(functions, 'completePiPayment');
    const { data } = await fn({ paymentId, txid });
    return data;
  }

  /* ----------  UTIL  ---------- */
  isPiBrowser() {
    return typeof window.Pi !== 'undefined';
  }
}

export default new PiNetworkService();