// cancelPiPayment.js
import fetch from "node-fetch";

// Remplace par l'identifiant de ton paiement incomplet
const PAYMENT_ID = "v9ufDKEQi2EcndrnpRJh3qdFDvZ7";

async function cancelPayment() {
  try {
    const response = await fetch(
      "https://cancelpayment-v6a2tspqbq-uc.a.run.app",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: PAYMENT_ID,
          paymentData: { metadata: { sandbox: true } } // true si c'est sandbox
        })
      }
    );

    const data = await response.json();
    console.log("✅ Résultat de l'annulation :", data);
  } catch (err) {
    console.error("❌ Erreur :", err);
  }
}

cancelPayment();
