// src/components/admin/navbar/Navbar.jsx (extrait)
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/admin/home" className={({ isActive }) => isActive ? styles.active : ''}>
        <i className="icon-dashboard"></i> dashboard
      </NavLink>

      <NavLink to="/admin/all-products" className={({ isActive }) => isActive ? styles.active : ''}>
        <i className="icon-box"></i> All Products
      </NavLink>

      {/* Bouton « Ajouter produit » (manquant) */}
      <NavLink to="/admin/add-product/new" className={({ isActive }) => isActive ? styles.active : ''}>
        <i className="icon-plus"></i> Add product
      </NavLink>

      {/* Bouton « Boutiques Pi » (nouveau) */}
      <NavLink to="/admin/stores" className={({ isActive }) => isActive ? styles.active : ''}>
        <i className="icon-map"></i> Pi Boutiques
      </NavLink>

      <NavLink to="/admin/orders" className={({ isActive }) => isActive ? styles.active : ''}>
        <i className="icon-list"></i> Orders
      </NavLink>
    </nav>
  );
}