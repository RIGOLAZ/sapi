// hooks/usePiPayment.js
import { useState, useEffect, useCallback } from 'react';

export const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sdkVersion, setSdkVersion] = useState('unknown');

  // Détection et initialisation Pi
  useEffect(() => {
    const initializePi = async () => {
      console.log("🔍 Vérification de l'environnement Pi...");

      if (typeof window === 'undefined') return;

      // Détection Pi Browser
      const userAgent = navigator.userAgent.toLowerCase();
      const piBrowserDetected = userAgent.includes('pi browser') || 
                               userAgent.includes('minepi') ||
                               !!window.Pi;
      
      setIsPiBrowser(piBrowserDetected);

      if (piBrowserDetected && window.Pi) {
        try {
          setLoading(true);
          console.log("🔄 Initialisation du SDK Pi...");
          
          // Initialisation standard
          await window.Pi.init({ 
            version: "2.0",
            sandbox: process.env.NODE_ENV === 'development'
          });
          
          // Vérification des méthodes disponibles
          const availableMethods = Object.keys(window.Pi).filter(key => 
            typeof window.Pi[key] === 'function'
          );
          
          console.log("🔧 Méthodes Pi disponibles:", availableMethods);
          setSdkVersion(availableMethods.join(', '));
          setIsInitialized(true);
          console.log("✅ SDK Pi initialisé avec succès");
          
        } catch (error) {
          console.error("❌ Échec initialisation SDK Pi:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    initializePi();
  }, []);

  // Configuration des callbacks Pi
  const setupPiCallbacks = useCallback((onApproval, onCompletion, onCancel, onError) => {
    if (!window.Pi) {
      throw new Error("SDK Pi non disponible");
    }

    console.log("🔄 Configuration des callbacks Pi...");

    // Vérification des méthodes de callback
    const hasCallbacks = typeof window.Pi.onReadyForServerApproval === 'function' &&
                        typeof window.Pi.onReadyForServerCompletion === 'function';

    if (!hasCallbacks) {
      console.warn("⚠️ Callbacks Pi non disponibles, mode simple activé");
      return { hasCallbacks: false };
    }

    // ✅ CALLBACK 1: Approbation serveur
    window.Pi.onReadyForServerApproval(async (paymentId) => {
      console.log("📞 Demande d'approbation serveur:", paymentId);
      try {
        await onApproval(paymentId);
      } catch (error) {
        console.error("❌ Erreur approbation:", error);
        if (window.Pi.cancelPayment) {
          await window.Pi.cancelPayment(paymentId);
        }
        onError(error);
      }
    });

    // ✅ CALLBACK 2: Complétion serveur
    window.Pi.onReadyForServerCompletion(async (paymentId, txid) => {
      console.log("📞 Demande de complétion serveur:", paymentId, txid);
      try {
        await onCompletion(paymentId, txid);
      } catch (error) {
        console.error("❌ Erreur complétion:", error);
        if (window.Pi.cancelPayment) {
          await window.Pi.cancelPayment(paymentId);
        }
        onError(error);
      }
    });

    // ✅ CALLBACK 3: Annulation
    if (window.Pi.onCancel) {
      window.Pi.onCancel((paymentId) => {
        console.log("❌ Paiement annulé:", paymentId);
        onCancel(paymentId);
      });
    }

    // ✅ CALLBACK 4: Erreurs
    if (window.Pi.onError) {
      window.Pi.onError((error, payment) => {
        console.error("❌ Erreur SDK Pi:", error);
        onError(error);
      });
    }

    console.log("✅ Callbacks Pi configurés");
    return { hasCallbacks: true };
  }, []);

  // Fonction de création de paiement
  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    console.log("🎯 Démarrage création paiement...");

    if (!isPiBrowser) {
      throw new Error("Veuillez utiliser Pi Browser pour les paiements");
    }

    if (!window.Pi || typeof window.Pi.createPayment !== 'function') {
      throw new Error("SDK Pi paiement non disponible");
    }

    // Validation du montant
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Montant de paiement invalide");
    }

    const paymentData = {
      amount: parsedAmount,
      memo: memo,
      metadata: metadata
    };

    console.log("💰 Données paiement préparées:", paymentData);

    try {
      setLoading(true);
      
      // Création du paiement - OUVRE L'INTERFACE OFFICIELLE PI
      console.log("🔄 Appel Pi.createPayment...");
      const payment = await window.Pi.createPayment(paymentData);
      
      console.log("✅ Paiement créé avec succès:", payment);
      return payment;
      
    } catch (error) {
      console.error("❌ Échec création paiement:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isPiBrowser]);

  return {
    isPiBrowser,
    isInitialized,
    loading,
    createPayment,
    setupPiCallbacks,
    sdkVersion
  };
};

export default usePiPayment;