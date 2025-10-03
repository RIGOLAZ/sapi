import React, { useState } from "react";
import usePiPayment from "../../hooks/usePiPayment";

const PiPaymentButton = ({ amount, memo, onSuccess }) => {
  const {
    isPiBrowser,
    loading,
    error,
    isAuthenticated,
    authenticate,
    createPayment,
  } = usePiPayment();
  const [status, setStatus] = useState("idle");

  const handlePayment = async () => {
    setStatus("authenticating");
    const auth = await authenticate();
    if (!auth) return setStatus("error");
    setStatus("processing");
    const payment = await createPayment({ amount, memo });
    if (payment) {
      setStatus("success");
      onSuccess && onSuccess(payment);
    } else {
      setStatus("error");
    }
  };

  return (
    <div>
      {!isPiBrowser && <div>Ouvre dans Pi Browser pour payer</div>}
      <button
        disabled={!isPiBrowser || loading || status === "success"}
        onClick={handlePayment}
      >
        {loading
          ? "Traitement..."
          : status === "success"
          ? "Paiement réussi !"
          : "Payer avec Pi"}
      </button>
      {error && <div style={{ color: "red" }}>{error.toString()}</div>}
    </div>
  );
};

export default PiPaymentButton;