/*  usePiPayment.js  –  version 100 % conforme Pi Network  */
import { useState } from "react";

const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(!!window.Pi);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Authentification Pi
  const authenticate = async () => {
    setLoading(true);
    setError(null);
    // const scopes = ['payments', 'username'];
    const scopes = ['payments'];
    try {
      const result = await window.Pi.authenticate(
        scopes,
        onIncompletePaymentFound
      );
      setIsAuthenticated(true);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err);
      setIsAuthenticated(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Callback paiement incomplet
  const onIncompletePaymentFound = async (payment) => {
    // Ici, tu peux gérer le paiement incomplet (ex: le valider côté serveur)
    // fetch('/api/validate-payment', { ... })
  };

  // Création du paiement
  const createPayment = async ({ amount, memo }) => {
    setLoading(true);
    setError(null);
    try {
      const payment = await window.Pi.createPayment({
        amount,
        memo,
        metadata: { cart: "sapi" },
        onReadyForServerApproval: async (paymentId) => {
          // Appelle ton backend pour approuver le paiement
          await fetch("/api/pi/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId }),
            headers: { "Content-Type": "application/json" },
          });
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          // Appelle ton backend pour compléter le paiement
          await fetch("/api/pi/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid }),
            headers: { "Content-Type": "application/json" },
          });
        },
        onCancel: (paymentId) => {
          setError("Paiement annulé");
        },
        onError: (error, payment) => {
          setError(error);
        },
      });
      return payment;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    isPiBrowser,
    loading,
    error,
    isAuthenticated,
    user,
    authenticate,
    createPayment,
  };
};

export default usePiPayment;