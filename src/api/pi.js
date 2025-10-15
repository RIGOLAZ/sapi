// src/api/pi.js
export const cancelPaymentOnServer = async (paymentId) => {
  try {
    const res = await fetch('https://cancelpayment-v6a2tspqbq-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) throw new Error('Erreur serveur');
    console.log('🧹 Paiement annulé côté serveur Pi :', paymentId);
  } catch (e) {
    console.warn('Impossible d’annuler le paiement :', e.message);
  }
};