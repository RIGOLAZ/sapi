// src/hooks/usePiPayment.js - VERSION COMPLÈTE
import { useState, useEffect, useCallback, useRef } from 'react';

let firebaseModules = null;
let firebaseInitialized = false;

export const usePiPayment = () => {
  const [piEnvironment, setPiEnvironment] = useState({
    isPiBrowser: false,
    isInitialized: false,
    environment: 'sandbox',
    platform: 'unknown',
    firebaseAvailable: false,
    sdkVersion: 'unknown'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Références pour les valeurs courantes
  const environmentRef = useRef(piEnvironment.environment);
  const platformRef = useRef(piEnvironment.platform);

  // Mise à jour des références
  useEffect(() => {
    environmentRef.current = piEnvironment.environment;
    platformRef.current = piEnvironment.platform;
  }, [piEnvironment.environment, piEnvironment.platform]);

  // Initialisation Firebase
  useEffect(() => {
    const initializeFirebase = async () => {
      if (firebaseInitialized) return;
      
      try {
        const firebaseApp = await import('../firebase/config');
        const firestore = await import('firebase/firestore');
        
        firebaseModules = { 
          db: firebaseApp.db, 
          doc: firestore.doc,
          setDoc: firestore.setDoc,
          updateDoc: firestore.updateDoc,
          serverTimestamp: firestore.serverTimestamp,
          collection: firestore.collection,
          addDoc: firestore.addDoc
        };
        
        firebaseInitialized = true;
        setPiEnvironment(prev => ({ 
          ...prev, 
          firebaseAvailable: true 
        }));
        console.log("✅ Firebase initialisé avec succès");
      } catch (error) {
        console.warn('⚠️ Firebase non configuré, mode local activé:', error.message);
        firebaseModules = null;
        firebaseInitialized = true;
      }
    };

    initializeFirebase();
  }, []);

  // Détection et initialisation Pi
  useEffect(() => {
    const detectAndInitializePi = async () => {
      if (typeof window === 'undefined') {
        console.log("❌ Environnement non supporté");
        return;
      }

      console.log("🔍 Détection de l'environnement Pi...");

      // Détection du navigateur Pi
      const userAgent = navigator.userAgent.toLowerCase();
      const isPiBrowser = userAgent.includes('pi browser') || userAgent.includes('minepi');
      const isPiApp = !!window.Pi;
      
      // Détermination de la plateforme
      let detectedPlatform = 'other';
      if (isPiBrowser) detectedPlatform = 'pi-browser';
      else if (isPiApp) detectedPlatform = 'pi-app';

      // Détermination de l'environnement
      let detectedEnvironment = 'sandbox';
      const currentHostname = window.location.hostname;
      const currentUrl = window.location.href;
      
      if (currentHostname.includes('mainnet') || process.env.NODE_ENV === 'production') {
        detectedEnvironment = 'mainnet';
      } else if (currentHostname.includes('testnet') || currentUrl.includes('sandbox')) {
        detectedEnvironment = 'sandbox';
      }

      console.log("🎯 Configuration détectée:", {
        platform: detectedPlatform,
        environment: detectedEnvironment,
        isPiBrowser: isPiBrowser || isPiApp,
        hasPiSDK: !!window.Pi
      });

      if (isPiBrowser || isPiApp) {
        try {
          setLoading(true);
          setError(null);
          
          if (window.Pi) {
            console.log("🔄 Initialisation du SDK Pi...");
            
            // Configuration d'initialisation
            const initConfig = {
              version: "2.0",
              sandbox: detectedEnvironment === 'sandbox'
            };

            await window.Pi.init(initConfig);
            
            // Vérification des méthodes disponibles
            const availableMethods = Object.keys(window.Pi).filter(key => 
              typeof window.Pi[key] === 'function'
            );
            
            setPiEnvironment({
              isPiBrowser: true,
              isInitialized: true,
              environment: detectedEnvironment,
              platform: detectedPlatform,
              firebaseAvailable: !!firebaseModules,
              sdkVersion: availableMethods.join(', ')
            });
            
            console.log("✅ SDK Pi initialisé avec succès:", {
              environment: detectedEnvironment,
              platform: detectedPlatform,
              methods: availableMethods.length
            });
          }
        } catch (initializationError) {
          console.error("❌ Échec de l'initialisation SDK Pi:", initializationError);
          setError(initializationError.message);
          setPiEnvironment(prev => ({ 
            ...prev, 
            isInitialized: false 
          }));
        } finally {
          setLoading(false);
        }
      } else {
        setPiEnvironment({
          isPiBrowser: false,
          isInitialized: false,
          environment: detectedEnvironment,
          platform: detectedPlatform,
          firebaseAvailable: !!firebaseModules,
          sdkVersion: 'none'
        });
      }
    };

    detectAndInitializePi();
  }, []);

  // Sauvegarde hybride Firebase + Local
  const savePaymentData = useCallback(async (collectionName, docId, data) => {
    const fullData = {
      ...data,
      environment: environmentRef.current,
      platform: platformRef.current,
      timestamp: Date.now(),
      appName: 'SAPI Store'
    };

    // Sauvegarde locale immédiate
    const localKey = `local_${collectionName}_${docId}`;
    const localData = {
      ...fullData,
      savedLocallyAt: new Date().toISOString(),
      collection: collectionName,
      documentId: docId,
      syncStatus: 'local'
    };
    
    localStorage.setItem(localKey, JSON.stringify(localData));
    console.log(`✅ Données sauvegardées localement: ${localKey}`);

    // Sauvegarde Firebase (silencieuse)
    if (firebaseModules && firebaseInitialized) {
      try {
        await firebaseModules.setDoc(
          firebaseModules.doc(firebaseModules.db, collectionName, docId), 
          {
            ...fullData,
            createdAt: firebaseModules.serverTimestamp(),
            syncStatus: 'synced',
            firebaseId: docId
          }
        );
        
        console.log(`✅ Données sauvegardées dans Firebase: ${collectionName}/${docId}`);
        
        // Mise à jour du statut local
        localStorage.setItem(localKey, JSON.stringify({
          ...localData,
          firebaseSynced: true,
          firebaseSyncedAt: new Date().toISOString(),
          syncStatus: 'synced'
        }));
        
      } catch (firebaseError) {
        console.warn(`⚠️ Erreur lors de la sauvegarde Firebase (${collectionName}):`, firebaseError.message);
        
        localStorage.setItem(localKey, JSON.stringify({
          ...localData,
          firebaseSynced: false,
          firebaseError: firebaseError.message,
          syncStatus: 'local_only'
        }));
      }
    } else {
      console.log(`📝 Firebase non disponible - conservation locale uniquement`);
    }

    return docId;
  }, []);

  const updatePaymentData = useCallback(async (collectionName, docId, updates) => {
    const fullUpdates = {
      ...updates,
      updatedAt: Date.now(),
      lastModified: new Date().toISOString()
    };

    // Mise à jour locale
    const localKey = `local_${collectionName}_${docId}`;
    const existingLocalData = localStorage.getItem(localKey);
    const existingData = existingLocalData ? JSON.parse(existingLocalData) : {};
    
    const updatedLocalData = {
      ...existingData,
      ...fullUpdates,
      lastUpdatedAt: new Date().toISOString(),
      updateCount: (existingData.updateCount || 0) + 1
    };
    
    localStorage.setItem(localKey, JSON.stringify(updatedLocalData));

    // Mise à jour Firebase (silencieuse)
    if (firebaseModules && firebaseInitialized) {
      try {
        await firebaseModules.updateDoc(
          firebaseModules.doc(firebaseModules.db, collectionName, docId), 
          {
            ...updates,
            updatedAt: firebaseModules.serverTimestamp(),
            syncStatus: 'updated',
            lastFirebaseSync: new Date().toISOString()
          }
        );
        
        console.log(`✅ Données mises à jour dans Firebase: ${collectionName}/${docId}`);
        
        localStorage.setItem(localKey, JSON.stringify({
          ...updatedLocalData,
          firebaseSynced: true,
          lastFirebaseSync: new Date().toISOString()
        }));
        
        return true;
      } catch (updateError) {
        console.warn(`⚠️ Erreur lors de la mise à jour Firebase:`, updateError.message);
        
        localStorage.setItem(localKey, JSON.stringify({
          ...updatedLocalData,
          firebaseSynced: false,
          firebaseUpdateError: updateError.message
        }));
        
        return false;
      }
    }
    
    return true;
  }, []);

  // Configuration des callbacks Pi
  const setupPiCallbacks = useCallback((callbacks) => {
    if (!window.Pi) {
      console.error("❌ SDK Pi non disponible pour la configuration des callbacks");
      setError("SDK Pi non disponible");
      return false;
    }

    console.log("🔄 Configuration des callbacks Pi Network...");

    const availableCallbacks = [];
    const currentEnvironment = environmentRef.current;

    try {
      // Callback: Approbation serveur
      if (typeof window.Pi.onReadyForServerApproval === 'function') {
        window.Pi.onReadyForServerApproval(async (paymentId) => {
          console.log(`📞 [${currentEnvironment}] Paiement prêt pour approbation:`, paymentId);
          try {
            if (callbacks.onApproval) {
              await callbacks.onApproval(paymentId, currentEnvironment);
            }
          } catch (approvalError) {
            console.error(`❌ Erreur dans le callback d'approbation:`, approvalError);
            if (callbacks.onError) {
              callbacks.onError(approvalError, paymentId);
            }
          }
        });
        availableCallbacks.push('onReadyForServerApproval');
      }

      // Callback: Complétion serveur
      if (typeof window.Pi.onReadyForServerCompletion === 'function') {
        window.Pi.onReadyForServerCompletion(async (paymentId, txid) => {
          console.log(`📞 [${currentEnvironment}] Paiement prêt pour complétion:`, paymentId, txid);
          try {
            if (callbacks.onCompletion) {
              await callbacks.onCompletion(paymentId, txid, currentEnvironment);
            }
          } catch (completionError) {
            console.error(`❌ Erreur dans le callback de complétion:`, completionError);
            if (callbacks.onError) {
              callbacks.onError(completionError, paymentId);
            }
          }
        });
        availableCallbacks.push('onReadyForServerCompletion');
      }

      // Callback: Annulation
      if (typeof window.Pi.onCancel === 'function') {
        window.Pi.onCancel((paymentId) => {
          console.log(`❌ [${currentEnvironment}] Paiement annulé par l'utilisateur:`, paymentId);
          if (callbacks.onCancel) {
            callbacks.onCancel(paymentId);
          }
        });
        availableCallbacks.push('onCancel');
      }

      // Callback: Erreurs
      if (typeof window.Pi.onError === 'function') {
        window.Pi.onError((piError, payment) => {
          console.error(`❌ [${currentEnvironment}] Erreur SDK Pi:`, piError, payment);
          if (callbacks.onError) {
            callbacks.onError(piError, payment?.identifier);
          }
        });
        availableCallbacks.push('onError');
      }

      console.log(`✅ Callbacks Pi configurés avec succès:`, availableCallbacks);
      return availableCallbacks.length > 0;

    } catch (callbackError) {
      console.error("❌ Erreur lors de la configuration des callbacks:", callbackError);
      setError(callbackError.message);
      return false;
    }
  }, []);

  // Version alternative simplifiée des callbacks
  const setupPiCallbacksSimple = useCallback((callbacks) => {
    if (!window.Pi) {
      console.error("❌ SDK Pi non disponible");
      return false;
    }

    console.log("🔄 Configuration simplifiée des callbacks Pi...");

    try {
      // Configuration directe sans wrapper
      if (typeof window.Pi.onReadyForServerApproval === 'function') {
        window.Pi.onReadyForServerApproval(callbacks.onApproval);
      }

      if (typeof window.Pi.onReadyForServerCompletion === 'function') {
        window.Pi.onReadyForServerCompletion(callbacks.onCompletion);
      }

      if (typeof window.Pi.onCancel === 'function') {
        window.Pi.onCancel(callbacks.onCancel);
      }

      if (typeof window.Pi.onError === 'function') {
        window.Pi.onError(callbacks.onError);
      }

      console.log("✅ Callbacks simplifiés configurés");
      return true;

    } catch (error) {
      console.error("❌ Erreur configuration callbacks simplifiés:", error);
      return false;
    }
  }, []);

  // Création de paiement
  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    console.log(`🎯 Démarrage de la création de paiement [${environmentRef.current}]...`);

    // Validations
    if (!piEnvironment.isPiBrowser) {
      const errorMessage = "Veuillez utiliser l'application Pi Browser pour effectuer des paiements Pi";
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (!window.Pi || !piEnvironment.isInitialized) {
      const errorMessage = "SDK Pi Network non initialisé. Veuillez réessayer.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      const errorMessage = "Le montant du paiement est invalide. Veuillez vérifier le total.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    const paymentData = {
      amount: parsedAmount,
      memo: memo || `Paiement SAPI Store - ${parsedAmount} PI`,
      metadata: {
        ...metadata,
        environment: environmentRef.current,
        platform: platformRef.current,
        appName: 'SAPI Store',
        timestamp: Date.now(),
        version: '1.0'
      }
    };

    try {
      setLoading(true);
      setError(null);
      
      console.log("💰 Préparation des données de paiement:", paymentData);

      // Création du paiement via SDK Pi
      const piPayment = await window.Pi.createPayment(paymentData);
      
      console.log("✅ Paiement Pi créé avec succès:", piPayment);

      // Sauvegarde hybride
      const paymentId = `pi_${environmentRef.current}_${piPayment.identifier}`;
      await savePaymentData('payments', paymentId, {
        ...paymentData,
        piPaymentId: piPayment.identifier,
        status: 'created',
        userUid: metadata.userId || 'guest',
        paymentFlow: 'initiated'
      });

      return { 
        ...piPayment, 
        localId: paymentId,
        environment: environmentRef.current,
        platform: platformRef.current
      };
      
    } catch (paymentError) {
      console.error("❌ Erreur lors de la création du paiement:", paymentError);
      setError(paymentError.message);
      
      // Gestion spécifique des erreurs Pi
      const errorMessage = paymentError.message || paymentError.toString();
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
        throw new Error("Paiement annulé par l'utilisateur");
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        throw new Error("Solde Pi insuffisant pour effectuer cette transaction");
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        throw new Error("Erreur réseau Pi Network. Vérifiez votre connexion.");
      } else if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
        throw new Error("Permissions Pi insuffisantes. Vérifiez la configuration.");
      } else {
        throw new Error(`Erreur de paiement: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [piEnvironment.isPiBrowser, piEnvironment.isInitialized, savePaymentData]);

// TEMPORAIRE - Simulation de paiement en attendant les permissions
    // const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    //   console.log("🎯 MODE SIMULATION - En attente des permissions Pi");
      
    //   // Simulation d'un paiement réussi
    //   const mockPayment = {
    //     identifier: `mock_payment_${Date.now()}`,
    //     amount: amount,
    //     memo: memo,
    //     metadata: metadata,
    //     status: 'mock_success'
    //   };
      
    //   console.log("✅ Paiement simulé (permissions Pi en attente)");
      
    //   // Sauvegarde pour la démo
    //   const paymentId = `mock_${Date.now()}`;
    //   await savePaymentData('payments', paymentId, {
    //     amount: amount,
    //     memo: memo,
    //     metadata: metadata,
    //     status: 'mock_created',
    //     piPaymentId: mockPayment.identifier
    //   });
      
    //   return mockPayment;
    // }, [savePaymentData]);

//End test-----------------------------------------

  // Complétion de paiement
  const completePayment = useCallback(async (paymentId, txid) => {
    if (!window.Pi) {
      const errorMessage = "SDK Pi non disponible pour la complétion";
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      console.log(`✅ Démarrage de la complétion du paiement:`, paymentId, txid);
      await window.Pi.completePayment(paymentId, txid);
      console.log(`🎉 Paiement complété avec succès`);
      return true;
    } catch (completionError) {
      console.error(`❌ Erreur lors de la complétion du paiement:`, completionError);
      setError(completionError.message);
      throw completionError;
    }
  }, []);

  // Récupération des données de paiement
  const getPaymentData = useCallback((paymentId) => {
    const localKey = `local_payments_${paymentId}`;
    try {
      const localData = localStorage.getItem(localKey);
      if (localData) {
        const parsedData = JSON.parse(localData);
        return {
          ...parsedData,
          source: 'local_storage',
          exists: true,
          retrievedAt: new Date().toISOString()
        };
      }
      
      return { 
        exists: false, 
        source: 'none',
        paymentId: paymentId
      };
    } catch (parseError) {
      console.error("❌ Erreur lors de la lecture des données locales:", parseError);
      return { 
        exists: false, 
        source: 'error',
        error: parseError.message 
      };
    }
  }, []);

  // Nettoyage des données locales
  const clearLocalData = useCallback((paymentId) => {
    const localKey = `local_payments_${paymentId}`;
    try {
      localStorage.removeItem(localKey);
      console.log(`🧹 Données locales nettoyées: ${localKey}`);
      return true;
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage des données:", error);
      return false;
    }
  }, []);

  // Diagnostic du SDK Pi
  const debugPiSDK = useCallback(() => {
    if (!window.Pi) {
      console.log("❌ window.Pi n'est pas disponible");
      return {
        available: false,
        message: "SDK Pi non chargé"
      };
    }

    const diagnosticInfo = {
      available: true,
      type: typeof window.Pi,
      methods: Object.keys(window.Pi).filter(key => typeof window.Pi[key] === 'function'),
      properties: Object.keys(window.Pi).filter(key => typeof window.Pi[key] !== 'function'),
      environment: piEnvironment,
      userAgent: navigator.userAgent.substring(0, 100)
    };

    console.log("🔍 Diagnostic complet SDK Pi:", diagnosticInfo);
    return diagnosticInfo;
  }, [piEnvironment]);

  // Réinitialisation des erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    ...piEnvironment,
    loading,
    error,
    
    // Actions principales
    createPayment,
    completePayment,
    setupPiCallbacks,
    setupPiCallbacksSimple,
    
    // Gestion des données
    savePaymentData,
    updatePaymentData,
    getPaymentData,
    clearLocalData,
    
    // Debug et utilitaires
    debugPiSDK,
    clearError
  };
};

export default usePiPayment;