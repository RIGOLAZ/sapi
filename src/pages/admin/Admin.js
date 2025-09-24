// src/pages/admin/Admin.jsx
// src/pages/admin/Admin.jsx
import { Route, Routes } from 'react-router-dom';
import Navbar from '../../components/admin/navbar/Navbar'; // ← ton ancien menu
import Home from '../../components/admin/home/Home';
import ViewProducts from '../../components/admin/viewProducts/ViewProducts';
import AddProduct from '../../components/admin/addProduct/AddProduct';
import Orders from '../../components/admin/orders/Orders';
import OrderDetails from '../../components/admin/orderDetails/OrderDetails';
import StoreAdmin from '../../components/admin/storeAdmin/StoreAdmin';
import styles from './Admin.module.css';

export default function Admin() {
  return (
    <div className={styles.admin}>
      <div className={styles.navbar}>
        <Navbar /></div>
      <div className={styles.content}>
        <Routes>
          <Route path="home" element={<Home />} />
          <Route path="all-products" element={<ViewProducts />} />
          <Route path="add-product/:id" element={<AddProduct />} />
          <Route path="orders" element={<Orders />} />
          <Route path="order-details/:id" element={<OrderDetails />} />
          <Route path="stores" element={<StoreAdmin />} /></Routes>
      </div>
    </div>
  );
}