import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';

class PiNetworkService {
  constructor() {
    this.Pi = window.Pi;
  }

  async init() {
  if (!this.Pi) throw new Error('Pi SDK not available');
  await this.Pi.init({ version: '2.0', sandbox: true });
}

  async authenticate() {
    await this.init();
    // écran de consentement standard
    return this.Pi.authenticate(['payments', 'username'], () => Promise.resolve());
  }

  async createPayment(amount, memo, metadata = {}) {
  await this.authenticate();
  return this.Pi.createPayment(
    { amount, memo, metadata },
    {
      onReadyForServerApproval: (paymentId) => {
        console.log('🔓 onReadyForServerApproval', paymentId);
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        console.log('✅ onReadyForServerCompletion', paymentId, txid);
      },
      onCancel: (paymentId) => {
        console.log('❌ onCancel', paymentId);
      },
      onError: (error) => {
        console.error('❌ onError', error);
      }
    }
  );
}
  isPiBrowser() {
    return typeof window.Pi !== 'undefined';
  }
}

export default PiNetworkService;