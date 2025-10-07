import React from 'react';
import { FaMobile, FaExternalLinkAlt } from 'react-icons/fa';

const PiMobileFallback = () => {
  const openInPiBrowser = () => {
    // URL profonde pour ouvrir directement dans Pi Browser
    const currentUrl = encodeURIComponent(window.location.href);
    const piBrowserUrl = `https://piwallet.app/browser?url=${currentUrl}`;
    
    window.open(piBrowserUrl, '_blank');
  };

  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <FaMobile size={40} style={{ marginBottom: '10px', color: '#8B5CF6' }} />
      <h3>Ouvrir dans Pi Browser</h3>
      <p>Pour payer avec Pi, ouvrez cette page dans l'application Pi Browser sur votre téléphone.</p>
      
      <button
        onClick={openInPiBrowser}
        style={{
          background: '#8B5CF6',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 auto'
        }}
      >
        <FaExternalLinkAlt />
        Ouvrir dans Pi Browser
      </button>
      
      <div style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
        <p>📲 Téléchargez Pi Browser depuis le Pi App si vous ne l'avez pas.</p>
      </div>
    </div>
  );
};

export default PiMobileFallback;