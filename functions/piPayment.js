const functions = require('firebase-functions');
const axios = require('axios');

// Configuration Pi Network
const PI_API_KEY = functions.config().pi_network.api_key;
const PI_NETWORK_URL = 'https://api.minepi.com/v2';

// exports.createPiPaymentIntent = functions.https.onCall(async (data, context) => {
//   try {
//     const { items, customerEmail } = data;

//     if (!context.auth) {
//       throw new functions.https.HttpsError(
//         "unauthenticated",
//         "User must be authenticated"
//       );
//     }

//     const totalAmount = items.reduce(
//       (sum, item) => sum + item.price * item.cartQuantity,
//       0
//     );

//     const response = await axios.post(
//       "https://api.minepi.com/v2/payments",
//       {
//         amount: totalAmount,
//         memo: `Etralishop purchase - ${customerEmail}`,
//         metadata: {
//           products: items.map((item) => ({
//             id: item.id,
//             name: item.name,
//             quantity: item.cartQuantity,
//             price: item.price,
//           })),
//         },
//       },
//       {
//         headers: {
//           Authorization: `Key ${PI_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     await admin.firestore().collection("paymentIntents").add({
//       userId: context.auth.uid,
//       paymentId: response.data.identifier,
//       amount: totalAmount,
//       items,
//       status: "pending",
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     return {
//       paymentId: response.data.identifier,
//       amount: response.data.amount,
//     };
//   } catch (error) {
//     console.error("Pi payment intent error:", error);
//     throw new functions.https.HttpsError("internal", error.message);
//   }
// });

// exports.verifyPiPayment = functions.https.onCall(async (data, context) => {
//   try {
//     const { paymentId, items, customerEmail } = data;

//     if (!context.auth) {
//       throw new functions.https.HttpsError(
//         "unauthenticated",
//         "User must be authenticated"
//       );
//     }

//     const response = await axios.get(
//       `https://api.minepi.com/v2/payments/${paymentId}`,
//       {
//         headers: {
//           Authorization: `Key ${PI_API_KEY}`,
//         },
//       }
//     );

//     const payment = response.data;

//     if (payment.status !== "completed") {
//       throw new functions.https.HttpsError(
//         "failed-precondition",
//         "Payment not completed"
//       );
//     }

//     const orderRef = await admin
//       .firestore()
//       .collection("orders")
//       .add({
//         userId: context.auth.uid,
//         customerEmail,
//         items,
//         amount: payment.amount,
//         currency: payment.currency,
//         transactionId: payment.transaction.txid,
//         paymentId,
//         status: "completed",
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//         updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//       });

//     await admin
//       .firestore()
//       .collection("users")
//       .doc(context.auth.uid)
//       .collection("orders")
//       .doc(orderRef.id)
//       .set({
//         orderId: orderRef.id,
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       });

//     await admin
//       .firestore()
//       .collection("users")
//       .doc(context.auth.uid)
//       .update({
//         cart: [],
//       });

//     return {
//       success: true,
//       orderId: orderRef.id,
//       transactionId: payment.transaction.txid,
//     };
//   } catch (error) {
//     console.error("Pi payment verification error:", error);
//     throw new functions.https.HttpsError("internal", error.message);
//   }
// });