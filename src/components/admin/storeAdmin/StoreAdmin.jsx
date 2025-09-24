// src/components/admin/storeAdmin/StoreAdmin.jsx
import React, { useEffect, useState } from 'react';
import { getStores, addStore, updateStore, deleteStore } from '../../../services/storeService';
import { toast } from 'react-toastify';
import Card from '../../card/Card'; // ← manquant
import styles from './StoreAdmin.module.css'; // ← manquant

export default function StoreAdmin() {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', latitude: '', longitude: '',
    street: '', city: '', postalCode: '', country: '',
    phone: '', email: '', products: [{ type: '', description: '', priceInPi: '' }]
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadStores(); }, []);

  const loadStores = async () => {
    const data = await getStores();
    setStores(data.filter(s => s.isActive));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        coordinates: { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) },
        address: { street: form.street, city: form.city, postalCode: form.postalCode, country: form.country },
        contact: { phone: form.phone, email: form.email }
      };
      if (editId) { await updateStore(editId, payload); toast.success('Boutique modifiée'); }
      else { await addStore(payload); toast.success('Boutique ajoutée'); }
      resetForm(); loadStores();
    } catch (err) { toast.error('Erreur lors de la sauvegarde'); }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', latitude: '', longitude: '', street: '', city: '', postalCode: '', country: '', phone: '', email: '', products: [{ type: '', description: '', priceInPi: '' }] });
    setEditId(null);
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cette boutique ?')) return;
    await deleteStore(id); toast.success('Boutique supprimée'); loadStores();
  };

  const handleChange = (e) => {
  const { name, value } = e.target;
  setForm((prev) => ({ ...prev, [name]: value }));
};

  const handleEdit = (store) => {
  setForm({
    ...store,
    latitude: store.coordinates?.latitude || '',
    longitude: store.coordinates?.longitude || '',
    street: store.address?.street || '',
    city: store.address?.city || '',
    postalCode: store.address?.postalCode || '',
    country: store.address?.country || '',
    phone: store.contact?.phone || '',
    email: store.contact?.email || '',
  });
  setEditId(store.id);
};

  const handleProductChange = (idx, field, val) => {
    const prods = [...form.products];
    prods[idx][field] = val;
    setForm({ ...form, products: prods });
  };
  const addProduct = () => setForm({ ...form, products: [...form.products, { type: '', description: '', priceInPi: '' }] });
  const removeProduct = idx => setForm({ ...form, products: form.products.filter((_, i) => i !== idx) });

  return (
  <div className={styles.container}>
    <h2 className={styles.title}>Gestion des Boutiques Pi</h2>

    {/* Formulaire de création / édition */}
    <form className={styles.form} onSubmit={handleSubmit}>
  <h3>{editId ? "Modifier la boutique" : "Nouvelle boutique"}</h3>
  <div className={styles.formGrid}>
    <input name="name" value={form.name} onChange={handleChange} placeholder="Nom de la boutique" required />
    <input name="latitude" type="number" value={form.latitude} onChange={handleChange} placeholder="Latitude" required />
    <input name="longitude" type="number" value={form.longitude} onChange={handleChange} placeholder="Longitude" required />
    <input name="street" value={form.street} onChange={handleChange} placeholder="Rue" required />
    <input name="city" value={form.city} onChange={handleChange} placeholder="Ville" required />
    <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="Code postal" required />
    <input name="country" value={form.country} onChange={handleChange} placeholder="Pays" required />
    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Téléphone" required />
    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required />
    <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" rows={3} required />
  </div>

  {/* Produits acceptés */}
  <h4>Produits acceptés en Pi</h4>
  {form.products.map((p, i) => (
    <div key={i} className={styles.productRow}>
      <input placeholder="Produit" value={p.type} onChange={(e) => handleProductChange(i, 'type', e.target.value)} required />
      <input placeholder="Description" value={p.description} onChange={(e) => handleProductChange(i, 'description', e.target.value)} required />
      <input placeholder="Prix (Pi)" type="number" step="0.01" value={p.priceInPi} onChange={(e) => handleProductChange(i, 'priceInPi', e.target.value)} required />
      <button type="button" className={styles.removeBtn} onClick={() => removeProduct(i)} title="Retirer">✖</button>
    </div>
  ))}
  <button type="button" className={styles.addBtn} onClick={addProduct}>+ Ajouter un produit</button>

  <div className={styles.actions}>
    <button type="submit" className={styles.saveBtn}>{editId ? "Mettre à jour" : "Créer la boutique"}</button>
    <button type="button" className={styles.cancelBtn} onClick={resetForm}>Annuler</button>
  </div>
</form>

    {/* Liste des boutiques */}
    <h3 className={styles.subTitle}>Liste des boutiques</h3>
    <div className={styles.grid}>
      {stores.map(s => (
        <Card key={s.id} cardClass={styles.storeCard}>
          <div className={styles.storeHeader}>
            <h4>{s.name}</h4>
            <span className={styles.badge}>{s.products?.length || 0} produit(s)</span>
          </div>
          <p className={styles.description}>{s.description}</p>
          <div className={styles.details}>
            <p>📍 {s.address?.city || '-'}{s.address?.city && s.address?.country ? ', ' : ''}{s.address?.country}</p>
            <p>📞 {s.contact?.phone || '-'}</p>
            <p>✉️ {s.contact?.email || '-'}</p>
            <p>💰 Accepte le Pi</p>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.editBtn} onClick={() => handleEdit(s)} title="Modifier">✏️ Modifier</button>
            <button className={styles.deleteBtn} onClick={() => handleDelete(s.id)} title="Supprimer">🗑️ Supprimer</button>
          </div>
        </Card>
      ))}
    </div>
  </div>
);
}