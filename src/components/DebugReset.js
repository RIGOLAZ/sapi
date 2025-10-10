// components/DebugReset.js
import { useResetCart } from '../hooks/useResetCart';

const DebugReset = () => {
  const { resetAfterPayment } = useResetCart();

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 1000,
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px'
    }}>
      <button 
        onClick={resetAfterPayment}
        style={{
          background: 'white',
          color: 'red',
          border: 'none',
          padding: '5px 10px',
          cursor: 'pointer'
        }}
      >
        RESET CART (Debug)
      </button>
    </div>
  );
};

export default DebugReset;