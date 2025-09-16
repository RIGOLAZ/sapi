// Remplacez complètement le contenu par :

import React, { useState, useEffect } from "react";
import styles from "./PayWithPi.module.css";

export default function PayWithPi({ amountPi, memo, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [piLoaded, setPiLoaded] = useState(false);

  useEffect(() => {
    // Vérifie que Pi SDK est chargé
    const checkPi = setInterval(() => {
      if (window.Pi) {
        setPiLoaded(true);
        clearInterval(checkPi);
      }
    }, 100);
    
    return () => clearInterval(checkPi);
  }, []);

  if (!piLoaded) {
    return <p className={styles.err}>Chargement de Pi Network...</p>;
  }

  const Pi = window.Pi;

  const payer = async () => {
    setErreur(null);
    setLoading(true);

    try {
      // Génération d'un orderId unique
      const orderId = `order_${Date.now()}`;
      
      /* ---------- 1) CRÉER LA FACTURE ---------- */
      const createResponse = await fetch(
        "https://us-central1-ecomm-f0ae6.cloudfunctions.net/createPiPayment",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            amount: amountPi, 
            memo,
            orderId 
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Erreur serveur: ${createResponse.status}`);
      }

      const { paymentId, tx_url } = await createResponse.json();

      /* ---------- 2) SIGNER LA TRANSACTION ---------- */
      const paymentResult = await Pi.createPayment(tx_url);
      
      /* ---------- 3) VÉRIFICATION ---------- */
      const verifyResponse = await fetch(
        "https://us-central1-ecomm-f0ae6.cloudfunctions.net/verifyPiPayment",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            paymentId,
            orderId
          })
        }
      );

      if (!verifyResponse.ok) {
        throw new Error(`Erreur vérification: ${verifyResponse.status}`);
      }

      const { ok } = await verifyResponse.json();
      if (!ok) throw new Error("Paiement non confirmé");

      onSuccess(paymentId);
      
    } catch (e) {
      console.error("Erreur complète:", e);
      setErreur(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.box}>
      <h3>Payer avec Pi Network</h3>
      <p>Montant : <strong>{amountPi} Pi</strong></p>
      <p>{memo}</p>

      <button onClick={payer} disabled={loading} className={styles.btn}>
        {loading ? "Traitement..." : "Confirmer le paiement"}
      </button>

      {erreur && <p className={styles.err}>{erreur}</p>}
    </div>
  );
}