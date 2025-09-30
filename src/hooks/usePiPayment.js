// hooks/usePiPayment.js
import { useState, useEffect, useCallback } from 'react';

export const usePiPayment = () => {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState('checking');
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [appConfig, setAppConfig] = useState({
    appSlug: 'sapi-460615d940fecab6',
    appName: 'Sapi Store',
    version: '2.0',
    productionUrls: ['https://sapi.etralis.com', 'https://www.sapi.etralis.com'],
    developmentUrls: ['http://localhost:3000', 'http://127.0.0.1:3000']
  });

  // Détection de l'environnement et configuration
  const detectEnvironmentAndConfig = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const hostname = window.location.hostname;
    
    const isPiBrowserDetected = userAgent.includes('pi browser') || 
                               userAgent.includes('minepi');
    
    const isProduction = hostname === 'https://sapi.etralis.com' || 
                        hostname.includes('https://ecomm-f0ae6.web.app/');
    
    const isTestnet = hostname.includes('testnet') || 
                     hostname.includes('localhost') ||
                     hostname.includes('127.0.0.1') ||
                     process.env.NODE_ENV === 'development';

    console.log("🌍 Détection environnement:", {
      hostname,
      isProduction,
      isTestnet,
      isPiBrowser: isPiBrowserDetected,
    });

    setIsPiBrowser(isPiBrowserDetected);

    if (isProduction) {
      setEnvironment('mainnet');
      console.log("🚀 Mode Production Mainnet détecté");
    } else if (isTestnet) {
      setEnvironment('testnet');
      console.log("🧪 Mode Testnet détecté");
    } else {
      setEnvironment('unknown');
      console.log("❓ Environnement non reconnu");
    }

    return { isPiBrowser: isPiBrowserDetected, isProduction, isTestnet };
  }, []);

  // Vérification que l'app est prête pour les transactions
  const verifyTransactionReadiness = useCallback(async () => {
    console.log("🔍 Vérification pré-transaction...");

    if (typeof window.Pi.createPayment !== 'function') {
      throw new Error("Méthode createPayment non disponible");
    }

    const hasCallbacks = typeof window.Pi.onReadyForServerApproval === 'function' &&
                        typeof window.Pi.onReadyForServerCompletion === 'function';
    
    if (!hasCallbacks) {
      console.warn("⚠️ Callbacks non disponibles - Mode simple");
    }

    try {
      console.log("🧪 Test de permission avec micro-transaction...");
      
      const testPayment = await window.Pi.createPayment({
        amount: 0.001,
        memo: 'Test de permission - SAPI Store',
        metadata: {
          test: true,
          environment: environment,
          app: appConfig.appName,
          timestamp: new Date().toISOString()
        }
      });

      console.log("✅ Test de permission réussi:", testPayment);
      setPermissionStatus('ready_for_transactions');
      
    } catch (error) {
      console.log("❌ Test de permission échoué:", error.message);
      
      if (error.message.includes('payments scope')) {
        setPermissionStatus('payments_permission_denied');
        throw new Error(
          "Permission de paiement refusée. " +
          "Activez les paiements dans Pi Browser → Paramètres → Apps → " + appConfig.appName
        );
      }
      
      setPermissionStatus('test_failed');
      throw error;
    }
  }, [environment, appConfig.appName]);

  // Initialisation du SDK Pi pour VRAIES transactions
  const initializePiSDK = useCallback(async () => {
    console.log("🚀 Initialisation SDK Pi pour transactions réelles...");

    if (!window.Pi) {
      throw new Error("SDK Pi non chargé. Vérifiez que pi-sdk.js est inclus.");
    }

    try {
      setLoading(true);
      setPermissionStatus('initializing');

      const initConfig = {
        version: "2.0",
        sandbox: environment === 'testnet'
      };

      console.log("⚙️ Configuration SDK Pi:", initConfig);

      const initResult = await window.Pi.init(initConfig);
      
      console.log("✅ SDK Pi initialisé avec succès:", initResult);
      console.log("📋 Détails de l'initialisation:", {
        environment: environment,
        sandbox: initConfig.sandbox,
        appSlug: appConfig.appSlug,
        timestamp: new Date().toISOString()
      });

      setIsInitialized(true);
      setPermissionStatus('initialized');

      // Vérification que tout est prêt pour les transactions
      await verifyTransactionReadiness();

    } catch (error) {
      console.error("❌ Échec initialisation SDK Pi:", error);
      
      if (error.message.includes('payments scope')) {
        setPermissionStatus('payments_scope_required');
        console.log("🔧 Solution: Activez les paiements dans Pi Browser → Paramètres → Apps → Votre App");
      } else if (error.message.includes('domain')) {
        setPermissionStatus('domain_not_configured');
        console.log("🔧 Solution: Ajoutez votre domaine sur Pi Developer Portal");
      } else {
        setPermissionStatus('initialization_failed');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [environment, appConfig.appSlug, verifyTransactionReadiness]); // ✅ verifyTransactionReadiness ajouté

  // Configuration des callbacks pour transactions réelles
  const setupPiCallbacks = useCallback((onApproval, onCompletion, onCancel, onError) => {
    if (!window.Pi) {
      throw new Error("SDK Pi non disponible");
    }

    console.log("🔄 Configuration des callbacks pour transactions réelles...");

    const hasRequiredCallbacks = typeof window.Pi.onReadyForServerApproval === 'function' &&
                                typeof window.Pi.onReadyForServerCompletion === 'function';

    if (!hasRequiredCallbacks) {
      throw new Error("Callbacks Pi non disponibles. Mettez à jour Pi Browser.");
    }

    window.Pi.onReadyForServerApproval(async (paymentId) => {
      console.log("📞 [REEL] Demande d'approbation serveur:", {
        paymentId,
        environment,
        timestamp: new Date().toISOString()
      });

      try {
        await onApproval(paymentId);
        console.log("✅ [REEL] Approbation serveur réussie");
      } catch (error) {
        console.error("❌ [REEL] Erreur approbation serveur:", error);
        
        if (window.Pi.cancelPayment) {
          await window.Pi.cancelPayment(paymentId);
        }
        
        onError(error);
      }
    });

    window.Pi.onReadyForServerCompletion(async (paymentId, txid) => {
      console.log("📞 [REEL] Demande de complétion serveur:", {
        paymentId,
        txid,
        environment,
        timestamp: new Date().toISOString()
      });

      try {
        await onCompletion(paymentId, txid);
        
        await window.Pi.completePayment(paymentId, txid);
        console.log("✅ [REEL] Paiement complété avec succès");
        
      } catch (error) {
        console.error("❌ [REEL] Erreur complétion serveur:", error);
        
        if (window.Pi.cancelPayment) {
          await window.Pi.cancelPayment(paymentId);
        }
        
        onError(error);
      }
    });

    window.Pi.onCancel((paymentId) => {
      console.log("❌ [REEL] Paiement annulé par l'utilisateur:", paymentId);
      onCancel(paymentId);
    });

    window.Pi.onError((error, payment) => {
      console.error("❌ [REEL] Erreur SDK Pi:", {
        error: error.message,
        payment,
        environment,
        timestamp: new Date().toISOString()
      });
      onError(error);
    });

    console.log("✅ Callbacks configurés pour transactions réelles");
    return { hasCallbacks: true, environment };
  }, [environment]);

  // FONCTION PRINCIPALE - Création de paiement RÉEL
  const createPayment = useCallback(async (amount, memo, metadata = {}) => {
    console.log("🎯 [REEL] Démarrage transaction réelle...", {
      amount,
      environment,
      timestamp: new Date().toISOString()
    });

    if (!isPiBrowser) {
      throw new Error("Pi Browser requis pour les transactions réelles");
    }

    if (!isInitialized) {
      throw new Error("SDK Pi non initialisé. Appelez initializePiSDK() d'abord.");
    }

    if (!window.Pi || typeof window.Pi.createPayment !== 'function') {
      throw new Error("SDK Pi transactions non disponible");
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Montant de transaction invalide");
    }

    if (parsedAmount < 0.00001) {
      throw new Error("Montant minimum: 0.01 π");
    }

    const paymentData = {
      amount: parsedAmount,
      memo: memo,
      metadata: {
        app: appConfig.appName,
        environment: environment,
        transaction_type: 'user_to_app',
        ...metadata,
        timestamp: new Date().toISOString(),
        app_slug: appConfig.appSlug
      }
    };

    console.log("💰 [REEL] Données de transaction:", paymentData);

    try {
      setLoading(true);
      
      console.log("🔄 [REEL] Appel Pi.createPayment...");
      
      const payment = await window.Pi.createPayment(paymentData);
      
      console.log("✅ [REEL] Transaction initiée avec succès:", {
        paymentId: payment.identifier,
        amount: payment.amount,
        environment,
        timestamp: new Date().toISOString()
      });

      return payment;
      
    } catch (error) {
      console.error("❌ [REEL] Échec de la transaction:", {
        error: error.message,
        amount,
        environment,
        timestamp: new Date().toISOString()
      });

      if (error.message.includes('payments scope')) {
        throw new Error(
          `Permission de paiement requise.\n\n` +
          `Pour activer les paiements :\n` +
          `1. Ouvrez Pi Browser\n` +
          `2. Allez dans Paramètres → Apps\n` +
          `3. Trouvez "${appConfig.appName}"\n` +
          `4. Activez l'autorisation "Paiements"\n` +
          `5. Rechargez cette page`
        );
      }

      if (error.message.includes('user cancelled') || error.message.includes('cancelled')) {
        throw new Error("Transaction annulée par l'utilisateur");
      }

      if (error.message.includes('network')) {
        throw new Error("Erreur réseau. Vérifiez votre connexion.");
      }

      if (error.message.includes('insufficient')) {
        throw new Error("Solde Pi insuffisant");
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [isPiBrowser, isInitialized, environment, appConfig.appName, appConfig.appSlug]);

  // Initialisation automatique au chargement
  useEffect(() => {
    const initialize = async () => {
      const { isPiBrowser: detectedPiBrowser } = detectEnvironmentAndConfig();

      if (detectedPiBrowser && window.Pi) {
        try {
          await initializePiSDK();
        } catch (error) {
          console.error("Échec initialisation automatique:", error);
        }
      }
    };

    initialize();
  }, [detectEnvironmentAndConfig, initializePiSDK]); // ✅ initializePiSDK ajouté

  return {
    // États
    isPiBrowser,
    isInitialized,
    loading,
    environment,
    permissionStatus,
    appConfig,
    
    // Actions principales
    createPayment,
    setupPiCallbacks,
    initializePiSDK,
    
    // Diagnostic
    diagnostic: {
      environment,
      permissionStatus,
      isPiBrowser,
      isInitialized,
      appConfig,
      readyForTransactions: permissionStatus === 'ready_for_transactions',
      timestamp: new Date().toISOString()
    }
  };
};

export default usePiPayment;