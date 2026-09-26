import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css';

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    const baseUrl = 'http://91.98.138.15:3000';
    input = baseUrl + input;
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
