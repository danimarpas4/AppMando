import React, { useState, useEffect } from 'react';
import { Share2, Users, AlertCircle, Save } from 'lucide-react';

export default function Settings({ token }) {
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = () => {
    fetch('/shares', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setShares(data))
    .catch(console.error);
  };

  const handleShare = (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    fetch('/share', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(res => {
      setLoading(false);
      if (res.error) {
        setMessage(res.error);
      } else {
        setMessage('Se ha compartido el acceso correctamente.');
        setEmail('');
        fetchShares();
      }
      setTimeout(() => setMessage(''), 4000);
    })
    .catch(() => {
      setLoading(false);
      setMessage('Error al compartir.');
      setTimeout(() => setMessage(''), 4000);
    });
  };

  return (
    <div className="p-4" style={{display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <Share2 size={24} color="var(--color-primary)" />
        <h2 className="card-title" style={{margin: 0}}>Sincronización de Pelotón</h2>
      </div>
      
      <p style={{fontSize: '0.9rem', color: 'var(--color-text-muted)'}}>
        Comparte tu base de datos (Agenda, Personal, Mandos, Deporte) con tus compañeros de sección o pelotón. 
        Ellos podrán visualizar (modo Solo Lectura) la información en sus propias cuentas de AppMando.
      </p>

      <form onSubmit={handleShare} className="card" style={{margin: 0}}>
        <h3 style={{fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '12px'}}>Dar acceso a un compañero</h3>
        <div style={{display: 'flex', gap: '8px'}}>
          <input 
            type="email" 
            placeholder="Correo electrónico del compañero..." 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)'}}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : 'Compartir'}
          </button>
        </div>
        {message && (
          <p style={{marginTop: '12px', fontSize: '0.85rem', color: message.includes('Error') ? 'var(--color-error)' : 'var(--color-success)'}}>
            {message}
          </p>
        )}
      </form>

      <div className="card" style={{margin: 0}}>
        <h3 style={{fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Users size={18} /> Compañeros con acceso
        </h3>
        
        {shares.length === 0 ? (
          <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>Nadie tiene acceso a tus datos actualmente.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {shares.map((s, idx) => (
              <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)'}}>
                <span>{s.viewer_email}</span>
                <span style={{fontSize: '0.75rem', background: 'rgba(74, 117, 60, 0.1)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '10px'}}>Lector</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{background: 'rgba(189, 155, 68, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--color-warning)', marginTop: '16px'}}>
        <h4 style={{fontSize: '0.9rem', color: 'var(--color-warning)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px'}}>
          <AlertCircle size={16}/> Aviso sobre privacidad
        </h4>
        <p style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0}}>
          Al compartir tu cuenta, los usuarios especificados podrán ver las novedades, faltas y notas de tu personal. Asegúrate de dar acceso solo a mandos autorizados.
        </p>
      </div>
    </div>
  );
}
