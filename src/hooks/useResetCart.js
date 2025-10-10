// hooks/useResetCart.js
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CLEAR_CART } from '../redux/slice/cartSlice';
import { RESET_AFTER_PAYMENT } from '../redux/slice/orderSlice';

export const useResetCart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const resetAfterPayment = () => {
    console.log('Resetting cart and order state...');
    
    // 1. Reset Redux state
    dispatch(CLEAR_CART());
    dispatch(RESET_AFTER_PAYMENT());
    
    // 2. Reset localStorage
    localStorage.removeItem('sapi_cart');
    localStorage.removeItem('currentOrder');
    
    // 3. Redirection FORCÉE
    setTimeout(() => {
      navigate('/order-success', { replace: true });
      // FORCER le rechargement si nécessaire
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }, 100);
  };

  return { resetAfterPayment };
};