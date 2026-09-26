import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Client ID del cliente OAuth de Google. No es un secreto (via incrustado en la
// web igualmente) y solo se usa para pedir el token de acceso; el backend nunca
// necesita el client secret para validarlo.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1013787350092-sfeob60asku5nujcv4rc0ukcv3kj5mof.apps.googleusercontent.com';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleManualAuth = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.token);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error de conexión con el servidor local');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.token);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error en Google Login');
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-wrapper">
        <div style={{textAlign: 'center', marginBottom: '32px', width: '100%', maxWidth: '280px'}}>
          <img src="/logo.svg" alt="AppMando Logo" style={{width: '100%', height: 'auto', dropShadow: '0 8px 16px rgba(0,0,0,0.5)'}} />
        </div>

        <form onSubmit={handleManualAuth} className="auth-card">
          <h2 className="auth-title">{isLogin ? 'Acceso al Sistema' : 'Registro de Personal'}</h2>
          
          {error && <div style={{color: 'var(--color-error)', backgroundColor: 'rgba(168, 66, 63, 0.1)', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', marginBottom: '16px', border: '1px solid rgba(168, 66, 63, 0.3)'}}>{error}</div>}

          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <input 
              type="email" 
              name="email"
              autoComplete="username"
              className="auth-input"
              placeholder="Correo electrónico" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              className="auth-input"
              placeholder="Contraseña" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <label style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer'}}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{width: 'auto'}} />
              Recordar mis credenciales
            </label>
            
            <button type="submit" className="auth-btn">
              {isLogin ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
            </button>
          </div>

          <div className="auth-separator">O ACCEDE CON</div>

          <div style={{display: 'flex', justifyContent: 'center'}}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('No se pudo conectar con Google. Revisa la conexión e inténtalo de nuevo.')}
              theme="filled_black"
              shape="pill"
            />
          </div>

          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            style={{background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', marginTop: '24px', cursor: 'pointer', width: '100%', textAlign: 'center', fontSize: '0.9rem'}}
          >
            {isLogin ? '¿No tienes cuenta? Solicita acceso' : '¿Ya estás registrado? Inicia sesión'}
          </button>
        </form>
      </div>
    </GoogleOAuthProvider>
  );
}
