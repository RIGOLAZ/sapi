// src/components/StoreMap.jsx
// src/components/storeMap/StoreMap.jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Icon } from 'leaflet';
import { getStores } from '../../services/storeService';
import { selectUserID } from '../../redux/slice/authSlice';
import 'leaflet/dist/leaflet.css';
import styles from './StoreMap.module.css';

// Fix icônes Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function StoreMap() {
  const [stores, setStores] = useState([]);
  const userID = useSelector(selectUserID);

  useEffect(() => {
    (async () => {
      const data = await getStores();
      setStores(data.filter(s => s.isActive && s.coordinates?.latitude && s.coordinates?.longitude));
    })();
  }, []);

  return (
    <div className={styles.container}><br /><br /><br />
      <h2 className={styles.title}>Boutiques acceptant Pi</h2>

      {/* Overlay uniquement si NON connecté */}
      {!userID && (
        <div className={styles.overlay}>
          <p>Connecte-toi pour voir les boutiques acceptant Pi</p>
          <Link to="/login" className={styles.btnPrimary}>Se connecter</Link>
        </div>
      )}

      {/* Carte uniquement si connecté */}
      {userID && (
        <MapContainer center={[48.86, 2.35]} zoom={6} className={styles.map}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {stores.map(s => (
            <Marker
              key={s.id}
              position={[s.coordinates.latitude, s.coordinates.longitude]}
            >
              <Popup>
                <strong>{s.name}</strong><br />
                📍 {s.address?.city || '-'}{s.address?.country ? `, ${s.address.country}` : ''}<br />
                📞 {s.contact?.phone || '-'}<br />
                ✉️ {s.contact?.email || '-'}<br />
                💰 Accepte le Pi
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}