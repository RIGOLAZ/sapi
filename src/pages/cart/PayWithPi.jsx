import { useSelector } from 'react-redux';
import { 
  selectCartTotalAmount
} from '../../redux/slice/cartSlice';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PI_WALLET = process.env.REACT_APP_PI_WALLET_ADDRESS;

export default function PayWithPi({ orderId, totalPi, onPaid }) {
  const [txid, setTxid] = useState('');
  const [checking, setChecking] = useState(false);
  
  const verify = async () => {
    if (!txid) return;
    setChecking(true);
    const res = await fetch(`https://api.minepi.com/v1/transactions/${txid}`);
    const tx = res.ok ? await res.json() : null;
    
    const ok = tx?.destination === PI_WALLET && parseFloat(tx.amount) >= totalPi;
    if (ok) {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'paid',
        paymentMethod: 'pi',
        txid,
        paidAt: serverTimestamp()
      });
      onPaid();          // redirection ou clear cart
    } else {
      alert('Invalid transaction or insufficient amount');
    }
    setChecking(false);
  };
  
  const totalAmount = useSelector(selectCartTotalAmount);
  const uri = `pi://payment?address=${PI_WALLET}&amount=${totalPi}&memo=${orderId}`;
  
  return (
    <div className="pay-with-pi">
      <p>Envoyez <b>{totalAmount} PI</b></p>
      <QRCodeCanvas value={uri} size={200} level="H" />
      <input
        placeholder="Paste the transaction hash"
        value={txid}
        onChange={e => setTxid(e.target.value)}
      />
      <button onClick={verify} disabled={checking}>
        {checking ? 'checking…' : 'I have paid → check'}
      </button>
    </div>
  );
}