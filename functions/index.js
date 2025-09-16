export const createPiPayment = onCall(
  { secrets: [PI_API_KEY], region: "us-central1", cors: true },
  async (request) => {
    const { amount, memo, orderId } = request.data;

    if (typeof amount !== "number" || amount <= 0 || !memo || !orderId)
      throw new HttpsError("invalid-argument", "amount, memo, orderId required");

    try {
      // corps exact exigé par Pi
      const body = {
        amount,
        memo,
        metadata: { orderId }   // DOIT être un objet
      };

      const { data } = await pi.post("/payments", body, {
        headers: piHeaders(PI_API_KEY.value())
      });

      await db.collection("pi_payments").doc(data.identifier).set({
        orderId,
        amount,
        memo,
        status: "pending",
        createdAt: new Date()
      });

      return { paymentId: data.identifier, tx_url: data.transaction_url };
    } catch (err) {
      // renvoyer le vrai message de Pi
      const msg = err.response?.data || err.message;
      console.error("Pi API 400 >", msg);
      throw new HttpsError("internal", msg);
    }
  }
);