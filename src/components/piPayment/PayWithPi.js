// src/components/piPayment/PayWithPi.js
import React, { useState } from "react";
import styles from "./PayWithPi.module.css";   // ton fichier de styles si tu en as

export default function PayWithPi({ amountPi, memo, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);

  // Récupère le SDK chargé par le CDN
  const Pi = window.Pi;
  if (!Pi) {
    return <p className={styles.err}>Ouvrez cette page dans Pi Browser pour payer.</p>;
  }

  const payer = async () => {
    setErreur(null);
    setLoading(true);

    try {
      /* ---------- 1) CRÉER LA FACTURE (Cloud Function) ---------- */
      const res = await fetch(
        "https://Douala.cloudfunctions.net/createPiPayment",
        {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ amount: amountPi, memo })
        }
      );
      if (!res.ok) throw new Error("Erreur serveur");
      const { paymentId, tx_url } = await res.json();

      /* ---------- 2) SIGNER LA TRANSACTION ---------- */
      await Pi.createPayment(tx_url);   // ouvre le widget Pi

      /* ---------- 3) VÉRIFICATION ---------- */
      const verif = await fetch(
        "https://Douala.cloudfunctions.net/verifyPiPayment",
        {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ paymentId })
        }
      );
      const { ok } = await verif.json();
      if (!ok) throw new Error("Paiement non confirmé");

      onSuccess(paymentId);             // tout est bon
    } catch (e) {
      setErreur(e.message);
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
        {loading ? "Ouverture du widget…" : "Confirmer le paiement"}
      </button>

      {erreur && <p className={styles.err}>{erreur}</p>}
    </div>
  );
}