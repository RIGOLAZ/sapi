import { useEffect } from 'react';
import { useUniversalCart } from './useUniversalCart';

export const useCartDebug = () => {
  const { cartItems, cartTotal, user, isLoading, getCurrentCart } = useUniversalCart();

  useEffect(() => {
    console.log('=== CART DEBUG ===');
    console.log('📦 Panier actuel:', getCurrentCart());
    console.log('📊 Total:', cartTotal);
    console.log('👤 User:', user?.uid);
    console.log('⏳ Loading:', isLoading);
    console.log('📍 localStorage:', localStorage.getItem('cart'));
    
    // Vérifier la structure des données
    const currentCart = getCurrentCart();
    if (currentCart.length > 0) {
      currentCart.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        });
      });
    }
  }, [cartItems, cartTotal, user, isLoading, getCurrentCart]);

  return { cartItems, cartTotal, user, isLoading };
};