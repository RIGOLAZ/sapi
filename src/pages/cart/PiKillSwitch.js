import React, { useState } from 'react';

const PiKillSwitch = () => {
  const [pid, setPid] = useState('v9ufDKEQi2EcndrnpRJh3qdFDvZ7'); // ID bloqué par défaut
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]   = useState('');

  const nuke = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('https://cancelpayment-v6a2tspqbq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: pid.trim() }),
      });
      const data = await res.json();
      setMsg(res.ok ? '✅ Paiement annulé côté Pi' : `❌ Erreur : ${data.error}`);
    } catch (e) {
      setMsg(`❌ Exception : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{border:'2px dashed red',padding:8,margin:8,background:'#ffecec'}}>
      <h3 style={{margin:0,fontSize:14,color:'red'}}>🔧 KILL-SWITCH PROVISOIRE</h3>
      <input
        value={pid}
        onChange={(e) => setPid(e.target.value)}
        placeholder="paymentId à tuer"
        style={{width:'100%',fontSize:12}}
      />
      <button onClick={nuke} disabled={loading} style={{marginTop:4}}>
        {loading ? 'Annulation…' : 'ANNULER CE PAIEMENT'}
      </button>
      {msg && <p style={{margin:0,fontSize:12,color:'#333'}}>{msg}</p>}
    </div>
  );
};

export default PiKillSwitch;