import React, { useState, useEffect } from 'react';
import { X, Smartphone, Share, MoreVertical, Download, CheckCircle2 } from 'lucide-react';

export default function InstallPrompt({ onClose }) {
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDevice('ios');
    } else if (/android/i.test(userAgent)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }
  }, []);

  const renderSteps = () => {
    if (device === 'ios') {
      return (
        <>
          <p className="install-subtitle">Instala AppMando en tu iPhone o iPad para acceder rápido.</p>
          <div className="install-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <strong>Busca el icono de <span className="highlight-blue">Compartir</span></strong>
              <p>En la barra de navegación inferior de Safari, pulsa el icono cuadrado con una flecha hacia arriba.</p>
              <div className="browser-mockup">
                <Share size={18} color="#007aff" />
              </div>
            </div>
          </div>
          <div className="install-step">
            <div className="step-icon"><CheckCircle2 size={24} color="#34c759" /></div>
            <div className="step-content">
              <strong>Pulsa "<span className="highlight-green">Añadir a la pantalla de inicio</span>"</strong>
              <p>Desliza el menú de opciones hacia arriba para encontrar este botón. ¡Listo, AppMando aparecerá como una app en tu escritorio!</p>
            </div>
          </div>
        </>
      );
    }

    if (device === 'android') {
      return (
        <>
          <p className="install-subtitle">Instala AppMando en tu Android para acceder rápido.</p>
          <div className="install-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <strong>Busca el menú de <span className="highlight-blue">Opciones</span></strong>
              <p>En la esquina superior derecha de Chrome, pulsa el icono de los tres puntos.</p>
              <div className="browser-mockup">
                <MoreVertical size={18} color="#5f6368" />
              </div>
            </div>
          </div>
          <div className="install-step">
            <div className="step-icon"><CheckCircle2 size={24} color="#34c759" /></div>
            <div className="step-content">
              <strong>Pulsa "<span className="highlight-green">Instalar aplicación</span>"</strong>
              <p>Listo, AppMando aparecerá como una app en tu móvil.</p>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <p className="install-subtitle">Busca el icono de instalar en la barra de direcciones de tu navegador.</p>
        <div className="install-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <strong>Busca el icono de <span className="highlight-blue">instalar</span> en la barra de direcciones</strong>
            <p>A la derecha de la URL, aparece un icono de instalar o una pantalla con una flecha.</p>
            <div className="browser-mockup desktop-mockup">
               <div className="mockup-nav">
                 <div className="mockup-btn"></div>
                 <div className="mockup-btn"></div>
               </div>
               <div className="mockup-url">
                 <span className="lock-icon">🔒</span> app.promilitar.es
               </div>
               <div className="mockup-install-btn">
                 <Download size={16} color="#4285f4" />
               </div>
            </div>
          </div>
        </div>
        <div className="install-step">
          <div className="step-icon"><CheckCircle2 size={24} color="#34c759" /></div>
          <div className="step-content">
            <strong>Pulsa "<span className="highlight-green">Instalar</span>"</strong>
            <p>Listo, AppMando aparecerá como una app en tu escritorio.</p>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay install-modal-overlay">
      <div className="install-modal">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        <div className="install-header-icon">
          <Smartphone size={32} color="#000" strokeWidth={2} />
        </div>
        
        <h2 className="install-title">AppMando Web App</h2>
        
        {renderSteps()}

        <button className="install-understood-btn" onClick={onClose}>
          ENTENDIDO
        </button>
      </div>
    </div>
  );
}
