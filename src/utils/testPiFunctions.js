import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase/config';

export const testPiFunctions = async () => {
    console.log('🧪 Test des fonctions Pi Network...');
    
    try {
        // Test healthCheck
        const healthCheck = httpsCallable(functions, 'healthCheck');
        const healthResult = await healthCheck();
        console.log('✅ Health Check:', healthResult.data);

        // Test avec un faux paymentId pour voir si la fonction répond
        const approvePayment = httpsCallable(functions, 'approvePiPayment');
        try {
            const approveResult = await approvePayment({
                paymentId: 'test-payment-123',
                paymentData: { amount: 1, memo: 'Test' }
            });
            console.log('✅ Approve Payment (test):', approveResult.data);
        } catch (error) {
            console.log('⚠️ Approve Payment erreur attendue:', error.message);
        }

    } catch (error) {
        console.error('❌ Erreur test fonctions:', error);
    }
};

// Exécutez le test
testPiFunctions();