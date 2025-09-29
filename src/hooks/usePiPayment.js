// hooks/usePiPayment.js
import { useState, useEffect, useCallback } from 'react';

export const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Détection du Pi Browser
  useEffect(() => {
    const checkPiBrowser = () => {
      if (typeof window === 'undefined') return false;
      
      const userAgent = navigator.userAgent.toLowerCase();
      const isPi = userAgent.includes('pi browser') || 
                   userAgent.includes('minepi') ||
                   !!window.Pi;
      
      console.log("🔍 Pi Browser detection:", {
        userAgent: userAgent.substring(0, 50),
        hasWindowPi: !!window.Pi,
        isPiBrowser: isPi
      });
      
      return isPi;
    };

    const piBrowser = checkPiBrowser();
    setIsPiBrowser(piBrowser);

    // Initialisation automatique si Pi Browser détecté
    if (piBrowser && window.Pi) {
      initializePiSDK();
    }
  }, []);

  // Initialisation du SDK Pi
  const initializePiSDK = async () => {
    try {
      if (!window.Pi) {
        throw new Error("Pi SDK not available");
      }

      console.log("🔄 Initializing Pi SDK...");
      
      // Méthode d'initialisation correcte selon la documentation Pi
      await window.Pi.init({ 
        version: "2.0",
        sandbox: process.env.NODE_ENV === 'development'
      });
      
      setIsInitialized(true);
      console.log("✅ Pi SDK initialized successfully");
      
      // Vérification des méthodes disponibles
      console.log("🔍 Pi SDK methods:", {
        createPayment: typeof window.Pi.createPayment,
        onReadyForServerApproval: typeof window.Pi.onReadyForServerApproval,
        onReadyForServerCompletion: typeof window.Pi.onReadyForServerCompletion,
        onCancel: typeof window.Pi.onCancel,
        onError: typeof window.Pi.onError
      });
      
    } catch (error) {
      console.error("❌ Pi SDK initialization failed:", error);
      throw error;
    }
  };

  // Configuration des callbacks Pi
  const setupPiCallbacks = useCallback((orderId, amount) => {
    if (!window.Pi) {
      throw new Error("Pi SDK not available");
    }

    console.log("🔄 Setting up Pi callbacks...");

    // Vérification que les méthodes existent
    const requiredMethods = [
      'onReadyForServerApproval',
      'onReadyForServerCompletion', 
      'onCancel',
      'onError',
      'createPayment'
    ];

    for (const method of requiredMethods) {
      if (typeof window.Pi[method] !== 'function') {
        throw new Error(`Pi SDK method ${method} is not available`);
      }
    }

    // ✅ CALLBACK 1: Approbation serveur
    window.Pi.onReadyForServerApproval(async (paymentId) => {
      console.log("📞 Server approval requested:", paymentId);
      
      try {
        // Simulation d'approbation - remplacez par votre API
        const approvalResult = await callServerApproval(paymentId, orderId, amount);
        
        if (approvalResult.success) {
          console.log("✅ Payment approved by server");
        } else {
          await window.Pi.cancelPayment(paymentId);
          throw new Error("Server approval failed");
        }
      } catch (error) {
        console.error("❌ Approval error:", error);
        await window.Pi.cancelPayment(paymentId);
        throw error;
      }
    });

    // ✅ CALLBACK 2: Complétion serveur
    window.Pi.onReadyForServerCompletion(async (paymentId, txid) => {
      console.log("📞 Server completion requested:", paymentId, txid);
      
      try {
        // Simulation de complétion - remplacez par votre API
        const completionResult = await callServerCompletion(paymentId, txid, orderId);
        
        if (completionResult.success) {
          await window.Pi.completePayment(paymentId, txid);
          console.log("✅ Payment completed successfully");
        } else {
          await window.Pi.cancelPayment(paymentId);
          throw new Error("Server completion failed");
        }
      } catch (error) {
        console.error("❌ Completion error:", error);
        await window.Pi.cancelPayment(paymentId);
        throw error;
      }
    });

    // ✅ CALLBACK 3: Annulation
    window.Pi.onCancel((paymentId) => {
      console.log("❌ Payment cancelled by user:", paymentId);
    });

    // ✅ CALLBACK 4: Erreurs
    window.Pi.onError((error, payment) => {
      console.error("❌ Pi SDK error:", error);
    });

    console.log("✅ Pi callbacks setup completed");
  }, []);

  // Fonctions de simulation d'API (à remplacer par vos vraies API)
  const callServerApproval = async (paymentId, orderId, amount) => {
    console.log("📤 Mock API: Approving payment", { paymentId, orderId, amount });
    
    // Simulation - remplacez par votre Cloud Function
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, paymentId });
      }, 1000);
    });
  };

  const callServerCompletion = async (paymentId, txid, orderId) => {
    console.log("📤 Mock API: Completing payment", { paymentId, txid, orderId });
    
    // Simulation - remplacez par votre Cloud Function
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, txid });
      }, 1000);
    });
  };

  // Fonction de création de paiement
  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    if (!isPiBrowser) {
      throw new Error("Please use Pi Browser for payments");
    }

    if (!window.Pi) {
      throw new Error("Pi SDK not available");
    }

    // Ré-initialisation si nécessaire
    if (!isInitialized) {
      await initializePiSDK();
    }

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Invalid payment amount");
    }

    const paymentData = {
      amount: parsedAmount,
      memo: memo,
      metadata: metadata
    };

    console.log("🎯 Creating payment with data:", paymentData);

    try {
      setLoading(true);
      
      // Configuration des callbacks AVANT de créer le paiement
      setupPiCallbacks(metadata.orderId, parsedAmount);
      
      // Création du paiement
      const payment = await window.Pi.createPayment(paymentData);
      console.log("✅ Payment created:", payment);
      
      return payment;
    } catch (error) {
      console.error("❌ Payment creation error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isPiBrowser, isInitialized, setupPiCallbacks]);

  return {
    isPiBrowser,
    isInitialized,
    loading,
    createPayment
  };
};

export default usePiPayment;