const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");
const crypto    = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const APP_SECRET = process.env.PI_APP_SECRET;   // <- nouveau système

/* 1. Callable : crée le paiement Pi */
exports.createPiPayment = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");
    const uid = context.auth.uid;
    const {orderId, amountPi, memo} = data;
    if (!orderId || !amountPi || amountPi <= 0)
      throw new functions.https.HttpsError("invalid-argument", "Bad args");

    const amountMicro = String(Math.round(amountPi * 1e12));

    try {
      const piRes = await axios.post(
        "https://api.minepi.com/v2/payments",
        {
          amount: amountMicro,
          memo,
          metadata: {orderId, uid},
          redirect_url: `https://etralishop.com/shop/pi/success?orderId=${orderId}`,
          cancel_url: `https://etralishop.com/shop/pi/cancel?orderId=${orderId}`
        },
        {headers: {Authorization: `Key ${APP_SECRET}`}}
      );

      await db.collection("users").doc(uid)
              .collection("orders").doc(orderId)
              .update({paymentId: piRes.data.identifier, status: "pending"});

      return {paymentId: piRes.data.identifier,
              qrData: `pi://payment?paymentId=${piRes.data.identifier}`};
    } catch (e) {
      console.error(e.response?.data || e.message);
      throw new functions.https.HttpsError("internal", "Pi API error");
    }
  });

/* 2. Webhook Pi */
exports.piWebhook = functions
  .https.onRequest(async (req, res) => {
    const sig = req.headers["x-pi-signature"];
    const hmac = crypto.createHmac("sha256", APP_SECRET)
                       .update(req.rawBody)
                       .digest("hex");
    if (sig !== hmac) return res.status(401).send("Bad sig");

    const {payment, event} = req.body;
    if (event?.type === "payment_completed") {
      const {metadata, transaction} = payment;
      await db.collection("users").doc(metadata.uid)
              .collection("orders").doc(metadata.orderId)
              .update({status: "completed", txid: transaction?.txid});
    }
    res.status(200).send("OK");
  });