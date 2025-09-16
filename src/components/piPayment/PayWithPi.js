// src/components/piPayment/PayWithPi.js
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./PayWithPi.module.css";

export default function PayWithPi({ amountPi, memo, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);
  const [piReady, setPiReady] = useState(false);

  useEffect(() => {
    // attend que Pi SDK soit chargé
    const t = setInterval(() => {
      if (window.Pi) { clearInterval(t); setPiReady(true); }
    }, 200);
    return () => clearInterval(t);
  }, []);

  if (!piReady) return <p className={styles.err}>Chargement de Pi Network…</p>;

  const Pi = window.Pi;

  const payer = async () => {
    setErreur(null);
    setLoading(true);

    try {
      const orderId = `order_${Date.now()}`;

      // 1. Créer la facture côté serveur
      const createRes = await fetch(
        "https://us-central1-ecomm-f0ae6.cloudfunctions.net/createPiPayment",
        {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ amount: Number(amountPi), memo, orderId })
        }
      );

      if (!createRes.ok) {
        const txt = await createRes.text();
        throw new Error(`Serveur ${createRes.status} : ${txt}`);
      }

      const { paymentId, tx_url } = await createRes.json();

      // 2. Signer la transaction dans Pi Browser
      await Pi.createPayment(tx_url);

      // 3. Vérification
      const verifRes = await fetch(
        "https://us-central1-ecomm-f0ae6.cloudfunctions.net/verifyPiPayment",
        {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ paymentId, orderId })
        }
      );
      const { ok } = await verifRes.json();
      if (!ok) throw new Error("Paiement non confirmé");

      toast.success(`Paiement réussi ! ID=${paymentId}`);
      onSuccess(paymentId);

    } catch (e) {
      const msg = e.message || JSON.stringify(e);
      console.error(">>> PayWithPi catch :", msg);
      setErreur(msg);
      toast.error(`Paiement : ${msg}`);
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
        {loading ? "Traitement…" : "Confirmer le paiement"}
      </button>

      {erreur && (
        <details className={styles.err}>
          <summary>Erreur complète</summary>
          <pre>{erreur}</pre>
        </details>
      )}
    </div>
  );
}