import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';

export const useCartSync = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [user, setUser] = useState(null);

  // Récupérer le panier local
  const getLocalCart = () => {
    try {
      const localCart = localStorage.getItem('cart');
      return localCart ? JSON.parse(localCart) : [];
    } catch (error) {
      console.error('Erreur lecture panier local:', error);
      return [];
    }
  };

  // Sauvegarder le panier localement
  const saveLocalCart = (items) => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Erreur sauvegarde panier local:', error);
    }
  };

  // Synchroniser avec Firebase
  const syncToFirebase = async (items) => {
    if (!user) return;

    try {
      const cartRef = doc(db, 'carts', user.uid);
      await updateDoc(cartRef, {
        items: items,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Si le document n'existe pas, le créer
      try {
        await setDoc(doc(db, 'carts', user.uid), {
          items: items,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (createError) {
        console.error('Erreur création document cart:', createError);
      }
    }
  };

  // Écouter les changements Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const cartRef = doc(db, 'carts', currentUser.uid);
        const unsubscribeCart = onSnapshot(cartRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const items = data.items || [];
            setCartItems(items);
            calculateTotal(items);
            saveLocalCart(items);
          } else {
            const localItems = getLocalCart();
            setCartItems(localItems);
            calculateTotal(localItems);
            syncToFirebase(localItems);
          }
        });

        return () => unsubscribeCart();
      } else {
        setUser(null);
        const localItems = getLocalCart();
        setCartItems(localItems);
        calculateTotal(localItems);
      }
    });

    return () => unsubscribe();
  }, []);

  // Calculer le total
  const calculateTotal = (items) => {
    if (!items || items.length === 0) {
      setCartTotal(0);
      return;
    }
    const total = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
    setCartTotal(total);
  };

  // Ajouter un article
  const addToCart = async (product) => {
    const currentItems = user ? cartItems : getLocalCart();
    
    const existingItem = currentItems.find(item => item.id === product.id);
    let newItems;

    if (existingItem) {
      newItems = currentItems.map(item =>
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newItems = [...currentItems, { ...product, quantity: 1 }];
    }

    if (user) {
      await syncToFirebase(newItems);
    } else {
      saveLocalCart(newItems);
      setCartItems(newItems);
      calculateTotal(newItems);
    }
  };

  // Retirer un article
  const removeFromCart = async (productId) => {
    const currentItems = user ? cartItems : getLocalCart();
    const newItems = currentItems.filter(item => item.id !== productId);

    if (user) {
      await syncToFirebase(newItems);
    } else {
      saveLocalCart(newItems);
      setCartItems(newItems);
      calculateTotal(newItems);
    }
  };

  // Vider le panier
  const clearCart = async () => {
    if (user) {
      await syncToFirebase([]);
    } else {
      saveLocalCart([]);
      setCartItems([]);
      setCartTotal(0);
    }
  };

  // Obtenir le nombre total d'articles
  const getItemCount = () => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  return {
    cartItems,
    cartTotal,
    user,
    addToCart,
    removeFromCart,
    clearCart,
    getItemCount
  };
};