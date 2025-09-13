import { useState, useEffect } from 'react';
import { useCartSync } from './useCartSync';

export const useUniversalCart = () => {
  const { cartItems, cartTotal, user, addToCart, removeFromCart, clearCart, getItemCount } = useCartSync();
  const [localCart, setLocalCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer le panier local existant (logique de ton header)
  const getExistingLocalCart = () => {
    try {
      const existing = localStorage.getItem('cartItems');
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  };

  // Synchroniser au montage
  useEffect(() => {
    const existingCart = getExistingLocalCart();
    
    if (existingCart.length > 0 && user && cartItems.length === 0) {
      // Migrer le panier local vers Firebase
      console.log('Migration panier local vers Firebase:', existingCart);
      existingCart.forEach(item => {
        addToCart(item);
      });
    } else if (!user && existingCart.length > 0) {
      // Utiliser le panier local si non connecté
      setLocalCart(existingCart);
    }
    
    setIsLoading(false);
  }, [user]);

  // Obtenir le panier actuel (local ou Firebase)
  const getCurrentCart = () => {
    if (user) return cartItems;
    return getExistingLocalCart();
  };

  // Obtenir le total actuel
  const getCurrentTotal = () => {
    const currentCart = getCurrentCart();
    return currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Obtenir le nombre d'items
  const getCurrentItemCount = () => {
    const currentCart = getCurrentCart();
    return currentCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  return {
    cartItems: getCurrentCart(),
    cartTotal: getCurrentTotal(),
    itemCount: getCurrentItemCount(),
    isLoading,
    user,
    addToCart,
    removeFromCart,
    clearCart,
    getCurrentCart,
    getCurrentTotal,
    getCurrentItemCount
  };
};