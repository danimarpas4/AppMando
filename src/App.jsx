import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, UserCog, Dumbbell, LogOut, Home } from 'lucide-react';
import Calendar from './components/Calendar';
import Sports from './components/Sports';
import Superiors from './components/Superiors';
import Subordinates from './components/Subordinates';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';
import VoiceAssistant from './components/VoiceAssistant';
import { Download, Moon, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('appmando_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [navContext, setNavContext] = useState(null);
  
  // Offline-first: Load from local first
  const [appData, setAppData] = useState(() => {
    try {
      const local = localStorage.getItem('appmando_offline_data');
      return local ? JSON.parse(local) : { tasks: [], subordinates: [], superiors: [], sports: [], calendar: [] };
    } catch(e) {
      return { tasks: [], subordinates: [], superiors: [], sports: [], calendar: [] };
    }
  });
  const [loading, setLoading] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isBlackout, setIsBlackout] = useState(() => localStorage.getItem('appmando_blackout') === 'true');

  useEffect(() => {
    if (isBlackout) {
      document.body.classList.add('theme-blackout');
    } else {
      document.body.classList.remove('theme-blackout');
    }
  }, [isBlackout]);

  const toggleBlackout = () => {
    const newVal = !isBlackout;
    setIsBlackout(newVal);
    localStorage.setItem('appmando_blackout', newVal);
  };

  useEffect(() => {
    if (token) {
      fetch('/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
         const safeData = {
           tasks: data.tasks || [],
           subordinates: data.subordinates || [],
           superiors: data.superiors || [],
           sports: data.sports || [],
           calendar: data.calendar || []
         };
         setAppData(safeData);
         localStorage.setItem('appmando_offline_data', JSON.stringify(safeData));
         setLoading(false);
         processOfflineQueue();
      })
      .catch((e) => {
         console.warn("Offline mode activated", e);
         setLoading(false);
      });
    }
  }, [token]);

  const processOfflineQueue = () => {
    const queue = JSON.parse(localStorage.getItem('appmando_sync_queue') || '[]');
    if (queue.length > 0) {
      console.log('Processing offline queue...');
      queue.forEach(item => {
        fetch('/sync', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: item.table, id: item.id, data: item.data })
        });
      });
      localStorage.removeItem('appmando_sync_queue');
    }
  };

  const handleVoiceCommand = (transcript) => {
    const text = transcript.toLowerCase();
    const subordinate = appData.subordinates.find(s => text.includes(s.name.toLowerCase()));
    
    if (subordinate) {
      if (text.includes('esguince') || text.includes('baja') || text.includes('lesión') || text.includes('hospital') || text.includes('novedad')) {
         const confirmacion = window.confirm(`Voz detectada: "${transcript}"\n\n¿Añadir novedad médica a ${subordinate.name}?`);
         if (confirmacion) {
            syncData('subordinates', subordinate.id, { ...subordinate, lesion: transcript });
            window.alert('Novedad médica añadida correctamente.');
         }
      } else {
         const confirmacion = window.confirm(`Voz detectada: "${transcript}"\n\n¿Añadir como tarea para ${subordinate.name} hoy?`);
         if (confirmacion) {
            const todayStr = new Date().toISOString().split('T')[0];
            const newEvent = {
               id: Date.now().toString(),
               title: transcript,
               type: 'subordinado',
               subordinateId: subordinate.id
            };
            syncData('calendar', todayStr, { dateStr: todayStr, events: [...(appData.calendar.find(c => c.dateStr === todayStr)?.events || []), newEvent] });
            syncData('tasks', newEvent.id, { title: newEvent.title, completed: false });
            window.alert('Tarea asignada correctamente en Agenda.');
         }
      }
    } else {
      window.alert(`Comando de voz: "${transcript}"\n\nNo se detectó el nombre del personal.`);
    }
  };

  if (!token) {
    return <Auth onAuthSuccess={(t) => {
      localStorage.setItem('appmando_token', t);
      setToken(t);
      setLoading(true);
    }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('appmando_token');
    setToken(null);
  };

  const syncData = (table, id, data) => {
    setAppData(prev => {
      const updatedTable = prev[table] ? [...prev[table]] : [];
      const index = updatedTable.findIndex(i => i.id === id);
      if (index >= 0) updatedTable[index] = { id, ...data };
      else updatedTable.push({ id, ...data });
      const newData = { ...prev, [table]: updatedTable };
      localStorage.setItem('appmando_offline_data', JSON.stringify(newData));
      return newData;
    });

    fetch('/sync', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, data })
    }).catch(e => {
      console.warn('Sync failed, queuing for later', e);
      const queue = JSON.parse(localStorage.getItem('appmando_sync_queue') || '[]');
      queue.push({ table, id, data });
      localStorage.setItem('appmando_sync_queue', JSON.stringify(queue));
    });
  };

  const deleteData = (table, id) => {
    setAppData(prev => {
      const updatedTable = prev[table] ? prev[table].filter(i => i.id !== id) : [];
      const newData = { ...prev, [table]: updatedTable };
      localStorage.setItem('appmando_offline_data', JSON.stringify(newData));
      return newData;
    });

    fetch('/delete', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id })
    }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="loading-splash">
        <img src="/logo.svg" alt="AppMando" className="splash-logo" />
        <div className="spinner"></div>
      </div>
    );
  }

  const handleGoToTab = (tab, ctx = null) => {
    setNavContext(ctx);
    setActiveTab(tab);
  };

  const renderTab = () => {
    const safeData = appData || {};
    switch (activeTab) {
      case 'dashboard': return <Dashboard data={safeData} goToTab={handleGoToTab} syncData={syncData} />;
      case 'calendar': return <Calendar initialData={safeData.calendar || []} sports={safeData.sports || []} subordinates={safeData.subordinates || []} syncData={syncData} deleteData={deleteData} />;
      case 'sports': return <Sports initialData={safeData.sports || []} activeContext={navContext} syncData={syncData} deleteData={deleteData} appData={safeData} />;
      case 'superiors': return <Superiors initialData={{superiors: safeData.superiors || []}} syncData={syncData} deleteData={deleteData} />;
      case 'subordinates': return <Subordinates initialData={safeData.subordinates || []} syncData={syncData} deleteData={deleteData} />;
      case 'settings': return <Settings token={token} />;
      default: return <Dashboard data={safeData} goToTab={handleGoToTab} syncData={syncData} />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <img src="/logo.svg" alt="AppMando Logo" className="header-logo" />
        </div>
        <div className="header-actions">
          <button className="install-btn" onClick={() => handleGoToTab('settings')} title="Ajustes de Sincronización">
            <SettingsIcon size={18} />
          </button>
          <button className="install-btn" onClick={toggleBlackout} title="Modo Nocturno">
            <Moon size={18} fill={isBlackout ? 'currentColor' : 'none'} />
          </button>
          <button className="install-btn" onClick={() => setShowInstallPrompt(true)}>
            <Download size={18} />
            <span className="hide-on-mobile">Instalar App</span>
          </button>
          <button className="logout-btn" onClick={handleLogout} title="Salir">
            <LogOut size={18} />
            <span className="hide-on-mobile">Salir</span>
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {renderTab()}
      </main>

      {token && <VoiceAssistant onVoiceCommand={handleVoiceCommand} />}
      {showInstallPrompt && <InstallPrompt onClose={() => setShowInstallPrompt(false)} />}

      <nav className="bottom-nav">
        <button 
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={24} />
          <span>Resumen</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={24} />
          <span>Agenda</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'sports' ? 'active' : ''}`}
          onClick={() => setActiveTab('sports')}
        >
          <Dumbbell size={24} />
          <span>Deporte</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'superiors' ? 'active' : ''}`}
          onClick={() => setActiveTab('superiors')}
        >
          <UserCog size={24} />
          <span>Mando</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'subordinates' ? 'active' : ''}`}
          onClick={() => setActiveTab('subordinates')}
        >
          <Users size={24} />
          <span>Personal</span>
        </button>
      </nav>
    </div>
  );
}

