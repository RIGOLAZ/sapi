// src/components/PiPaymentOptions/PiPaymentOptions.js

import React, { useState, useEffect } from 'react';
import { FaTimes, FaQrcode, FaCopy, FaWallet } from 'react-icons/fa';
import QRCode from 'qrcode.react';
import { toast } from 'react-toastify';
import styles from './PiPaymentOptions.module.scss'; // Assurez-vous d'avoir ce fichier SCSS

// Import de la fonction de paiement Pi que nous avons déjà définie
import { initiatePiPayment } from '../../lib/PiPayment'; 

// Votre adresse de portefeuille Pi (exemple)
// REMPLACER PAR VOTRE VRAIE ADRESSE DE PORTEFEUILLE PI
const PI_WALLET_ADDRESS = "GDA8WJ3N4X3K5B6M7P8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H"; 

const PiPaymentOptions = ({ amount, cartItems, onClose, onPaymentSuccess, onPaymentError }) => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [piPaymentUrl, setPiPaymentUrl] = useState(''); // Pour stocker l'URL du paiement Pi pour le QR Code

  // Simule la génération de l'URL de paiement Pi pour le QR code
  // Note: Le SDK Pi gère l'ouverture de l'interface native.
  // Ce QR code serait pour un paiement "hors-bande" ou un lien direct si Pi supportait cela.
  // Pour un paiement direct via le SDK (le plus recommandé), on appelle initiatePiPayment.
  useEffect(() => {
    // Ceci est une URL illustrative. L'API Pi ne fournit pas directement une URL de paiement externe
    // que vous pouvez encoder dans un QR code pour être scanné par n'importe quel lecteur.
    // Le QR code Pi "officiel" serait généré par l'API Pi si elle le permettait ou par le wallet de l'utilisateur.
    // Nous allons générer ici un QR code qui pourrait théoriquement pointer vers un lien de paiement personnalisé.
    // Pour l'instant, c'est plus un concept.
    const baseUrl = "https://pi.network/pay/"; // URL fictive
    const params = new URLSearchParams({
      amount: amount,
      currency: "Pi",
      memo: `EtraliShop Order Total: ${amount}`,
      receiver: PI_WALLET_ADDRESS,
      orderId: `CMD-${new Date().getTime()}`, // Générer un ID unique ici ou le passer en prop
    }).toString();
    setPiPaymentUrl(`${baseUrl}?${params}`);
  }, [amount, cartItems]);


  const handleOfficialPiPayment = async () => {
    if (loadingPayment) return;
    setLoadingPayment(true);
    toast.info("Lancement du paiement Pi officiel via le navigateur...", { position: "bottom-right" });

    try {
        await initiatePiPayment(amount, cartItems); // Appel de la fonction du SDK Pi
        toast.success("Paiement initié avec succès. Vérifiez votre navigateur Pi.", { position: "bottom-right" });
        onPaymentSuccess(); // Remonte l'info de succès au composant parent
    } catch (error) {
        console.error("Erreur de paiement Pi officiel:", error);
        onPaymentError(error); // Remonte l'erreur au composant parent
    } finally {
        setLoadingPayment(false);
    }
  };

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(PI_WALLET_ADDRESS)
      .then(() => toast.success("Adresse du portefeuille Pi copiée !", { position: "bottom-right" }))
      .catch(() => toast.error("Échec de la copie de l'adresse.", { position: "bottom-right" }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes />
        </button>
        <h2>Choisissez votre méthode de paiement Pi</h2>

        {/* Option 1: Paiement officiel via le SDK Pi (recommandé) */}
        <div className={styles.paymentOption}>
          <h3><FaQrcode /> Payer via Pi Browser (Recommandé)</h3>
          <p>Le moyen le plus simple et le plus sécurisé de payer avec Pi. L'interface de paiement s'ouvrira automatiquement.</p>
          <button 
            className={styles.actionButton} 
            onClick={handleOfficialPiPayment} 
            disabled={loadingPayment}
          >
            {loadingPayment ? "Chargement..." : "Payer avec Pi Browser"}
          </button>
        </div>

        {/* Option 2: Paiement manuel par adresse de portefeuille */}
        <div className={styles.paymentOption}>
          <h3><FaWallet /> Payer par adresse de portefeuille</h3>
          <p>Envoyez le montant total de {amount} Pi à l'adresse ci-dessous. N'oubliez pas d'inclure la référence de votre commande dans le mémo de la transaction de votre Pi Wallet : <strong>{`Order ${cartItems.length > 0 ? cartItems[0].id : 'N/A'}`}</strong></p>
          <div className={styles.walletAddressContainer}>
            <span className={styles.walletAddress}>{PI_WALLET_ADDRESS}</span>
            <button className={styles.copyButton} onClick={copyWalletAddress}>
              <FaCopy /> Copier
            </button>
          </div>
          {/* QR Code pour l'adresse de portefeuille (optionnel) ou pour un lien de paiement si disponible */}
          <div className={styles.qrCodeContainer}>
            <QRCode value={PI_WALLET_ADDRESS} size={180} level="H" />
            <p className={styles.qrText}>Scannez pour obtenir l'adresse</p>
          </div>
          <small className={styles.warningText}>Attention : Les paiements manuels nécessitent une vérification manuelle et peuvent prendre plus de temps. Assurez-vous d'inclure la référence de commande correcte.</small>
        </div>

      </div>
    </div>
  );
};

export default PiPaymentOptions;
