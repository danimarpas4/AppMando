import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css';

// En producción la API se sirve en el mismo dominio (nginx hace de proxy), así que
// las peticiones van con ruta relativa. Solo en desarrollo se antepone el origen,
// definiéndolo en un fichero .env local: VITE_API_BASE=http://localhost:3000
const API_BASE = import.meta.env.VITE_API_BASE || '';

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (API_BASE && typeof input === 'string' && input.startsWith('/')) {
    input = API_BASE + input;
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
