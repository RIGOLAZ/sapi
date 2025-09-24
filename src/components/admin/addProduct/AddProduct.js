// src/components/admin/addProduct/AddProduct.jsx
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { selectProducts } from '../../../redux/slice/productSlice';
import Card from '../../card/Card';
import Loader from '../../loader/Loader';
import styles from './AddProduct.module.css';

const categories = [
  { id: 1, name: 'Électricité' },
  { id: 2, name: 'Sécurité' },
  { id: 3, name: 'Climatisation' },
  { id: 4, name: 'Gadgets' },
  { id: 5, name: 'Informatique' },
];

const initialState = {
  name: '',
  imageURL: '',
  price: 0,
  category: '',
  brand: '',
  desc: '',
};

export default function AddProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useSelector(selectProducts);

  // ✅ valeur par défaut si on arrive direct sur "new"
  const productEdit = products.find((p) => p.id === id) ?? null;

  const [product, setProduct] = useState(() =>
    id === 'ADD' ? { ...initialState } : { ...initialState, ...productEdit }
  );

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (err) => {
        toast.error(err.message);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProduct((prev) => ({ ...prev, imageURL: url }));
        toast.success('Image téléversée !');
        setUploadProgress(0);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (id === 'ADD') {
        await addDoc(collection(db, 'products'), {
          name: product.name,
          imageURL: product.imageURL,
          price: Number(product.price),
          category: product.category,
          brand: product.brand,
          desc: product.desc,
          createdAt: serverTimestamp(),
        });
        toast.success('Produit ajouté !');
      } else {
        // Édition
        if (product.imageURL !== productEdit?.imageURL && productEdit?.imageURL) {
          const oldRef = ref(storage, productEdit.imageURL);
          await deleteObject(oldRef).catch(() => {});
        }
        await setDoc(doc(db, 'products', id), {
          name: product.name,
          imageURL: product.imageURL,
          price: Number(product.price),
          category: product.category,
          brand: product.brand,
          desc: product.desc,
          createdAt: productEdit?.createdAt || serverTimestamp(),
          editedAt: serverTimestamp(),
        });
        toast.success('Produit modifié !');
      }

      setIsLoading(false);
      navigate('/admin/all-products');
    } catch (err) {
      setIsLoading(false);
      toast.error(err.message);
    }
  };

  return (
    <>
      {isLoading && <Loader />}
      <div className={styles.product}>
        <h2>{id === 'ADD' ? 'Ajouter un produit' : 'Modifier le produit'}</h2>
        <Card cardClass={styles.card}>
          <form onSubmit={handleSubmit}>
            <label>Nom du produit :</label>
            <input
              type="text"
              placeholder="Nom du produit"
              required
              name="name"
              value={product.name}
              onChange={handleInputChange}
            />

            <label>Image du produit :</label>
            <Card cardClass={styles.group}>
              {uploadProgress > 0 && (
                <div className={styles.progress}>
                  <div
                    className={styles['progress-bar']}
                    style={{ width: `${uploadProgress}%` }}
                  >
                    {uploadProgress < 100
                      ? `Téléversement ${uploadProgress.toFixed(0)}%`
                      : 'Téléversement terminé !'}
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              {product.imageURL && (
                <input
                  type="text"
                  placeholder="URL image"
                  value={product.imageURL}
                  disabled
                />
              )}
            </Card>

            <label>Prix du produit :</label>
            <input
              type="number"
              placeholder="Prix"
              required
              name="price"
              value={product.price}
              onChange={handleInputChange}
            />

            <label>Catégorie :</label>
            <select
              required
              name="category"
              value={product.category}
              onChange={handleInputChange}
            >
              <option value="" disabled>
                -- Choisis une catégorie --
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <label>Marque / Fabriquant :</label>
            <input
              type="text"
              placeholder="Marque"
              required
              name="brand"
              value={product.brand}
              onChange={handleInputChange}
            />

            <label>Description :</label>
            <textarea
              name="desc"
              required
              value={product.desc}
              onChange={handleInputChange}
              rows="6"
            />

            <button type="submit" className="--btn --btn-primary">
              {id === 'ADD' ? 'Enregistrer le produit' : 'Mettre à jour'}
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}