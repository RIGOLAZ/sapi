// ProductDetail.js ou ProductPage.js
import React, { useState } from 'react';
import { useCartSync } from '../../../hooks/useCartSync';

const ProductDetail = ({ product }) => {
  const { addToCart } = useCartSync();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    const itemToAdd = {
      ...product,
      quantity: quantity
    };
    
    addToCart(itemToAdd);
    setAdded(true);
    
    // Reset le feedback après 2 secondes
    setTimeout(() => setAdded(false), 2000);
  };

  const handleQuantityChange = (e) => {
    setQuantity(parseInt(e.target.value));
  };

  return (
    <div className="product-detail">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>
      
      <div className="product-info">
        <h1>{product.name}</h1>
        <p className="price">{product.price} π</p>
        <p className="description">{product.description}</p>
        
        <div className="purchase-options">
          <div className="quantity-selector">
            <label>Quantité:</label>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={handleQuantityChange}
              className="quantity-input"
            />
          </div>
          
          <button 
            onClick={handleAddToCart} 
            className={`btn-add-cart ${added ? 'added' : ''}`}
            disabled={added}
          >
            {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;