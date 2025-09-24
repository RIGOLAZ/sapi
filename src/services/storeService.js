// src/services/storeService.js
import { db } from '../firebase/config';
import {
  collection, addDoc, getDocs, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';

const storesCol = collection(db, 'stores');

// Récupérer toutes les boutiques actives
export async function getStores() {
  const snapshot = await getDocs(storesCol);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Ajouter une boutique (admin)
export async function addStore(data) {
  return await addDoc(storesCol, {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// Modifier une boutique (admin)
export async function updateStore(id, data) {
  const ref = doc(db, 'stores', id);
  return await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// Supprimer (soft) une boutique (admin)
export async function deleteStore(id) {
  const ref = doc(db, 'stores', id);
  return await updateDoc(ref, { isActive: false, updatedAt: serverTimestamp() });
}