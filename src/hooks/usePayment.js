// hooks/usePayment.js
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { PAYMENT_SUCCESS, HARD_RESET_ORDER } from '../redux/slice/orderSlice';
import { CLEAR_CART } from '../redux/slice/cartSlice';
import { INCREMENT_ORDER_STATS } from '../redux/slice/authSlice';

export const usePayment = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { cartItems, cartTotal } = useSelector(state => state.cart);

  const handlePaymentSuccess = async (paymentData) => {
    const successUrl = `/checkout-success?order=${paymentData.orderId}&txid=${paymentData.txid}&amount=${paymentData.amount}`;
    window.location.href = successUrl; // Utiliser window.location pour forcer le rechargement
    try {
      // 1. Générer un ID de commande unique
      const orderId = `SAPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 2. FORCER la réinitialisation du panier IMMÉDIATEMENT
      dispatch(CLEAR_CART());
      
      // 3. Mettre à jour les stats admin
      dispatch(INCREMENT_ORDER_STATS({ amount: cartTotal }));
      
      // 4. Marquer le paiement comme réussi
      dispatch(PAYMENT_SUCCESS({
        orderId,
        amount: cartTotal,
        paymentData
      }));

      // 5. FORCER la navigation avec remplacement
      setTimeout(() => {
        navigate('/order-success', { 
          replace: true,
          state: { 
            orderId,
            amount: cartTotal,
            timestamp: new Date().toISOString(),
            // FORCER le rechargement des données
            forceRefresh: true
          }
        });
      }, 100);

      // 6. Nettoyage final après délai
      setTimeout(() => {
        dispatch(HARD_RESET_ORDER());
      }, 5000);

    } catch (error) {
      console.error('Payment success handling error:', error);
    }
  };

  return {
    handlePaymentSuccess
  };
};