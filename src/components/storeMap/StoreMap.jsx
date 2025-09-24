// src/components/StoreMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { getStores } from '../../services/storeService';
import 'leaflet/dist/leaflet.css';
import './StoreMap.css';

// Fix icônes Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function StoreMap() {
  const [stores, setStores] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await getStores();
      setStores(data.filter(s => s.isActive));
    })();
  }, []);

  return (
    <div className="container map-wrap">
      <br />
      <br />
      <h2>Boutiques acceptant Pi</h2>
      <MapContainer center={[48.86, 2.35]} zoom={6} style={{ height: '60vh' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {stores.map(s => (
  <Marker
    key={s.id}
    position={[
      s.coordinates?.latitude || 0,
      s.coordinates?.longitude || 0
    ]}
  >
    <Popup>
      <strong>{s.name}</strong><br />
      📍 {s.address?.city || '-'}{s.address?.country ? `, ${s.address.country}` : ''}<br />
      📞 {s.contact?.phone || '-'}<br />
      ✉️ {s.contact?.email || '-'}
    </Popup>
  </Marker>
))}
      </MapContainer>
    </div>
  );
}