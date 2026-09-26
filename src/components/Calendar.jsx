import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Bell, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Calendar({ initialData = [], sports = [], subordinates = [], syncData, deleteData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); 
  
  // Transform initialData array to the expected object format { "2023-10-15": [...] }
  const [events, setEvents] = useState(() => {
    const evs = {};
    initialData.forEach(item => {
      evs[item.dateStr] = item.events || (item.data ? item.data.events : []);
    });
    return evs;
  });

  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'tarea', alarmTime: '', priority: '#ffffff', sportId: '', sportWeek: 0, sportDay: 0, subordinateId: '', endDate: '' }); 
  
  // PDF Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEvents, setExportEvents] = useState([]);
  
  // Selection for moving events
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleOpenExport = () => {
    // Gather events for the current view
    const daysInView = getDays();
    let currentEvents = [];
    daysInView.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (events[dateStr]) {
        events[dateStr].forEach(ev => currentEvents.push({ ...ev, dateStr, dateFormatted: format(day, 'dd MMM', {locale: es}), selected: true }));
      }
    });
    setExportEvents(currentEvents);
    setShowExportModal(true);
  };

  const moveEventToNextDay = (dateStr, id) => {
    const currentDayEvents = events[dateStr] || [];
    const evToMove = currentDayEvents.find(e => e.id === id);
    if (!evToMove) return;

    const newCurrentDayEvents = currentDayEvents.filter(e => e.id !== id);
    
    const cDate = parseISO(dateStr);
    const nextDate = addDays(cDate, 1);
    const nextDateStr = format(nextDate, 'yyyy-MM-dd');
    
    const nextDayEvents = events[nextDateStr] ? [...events[nextDateStr]] : [];
    nextDayEvents.push(evToMove);
    
    setEvents({ ...events, [dateStr]: newCurrentDayEvents, [nextDateStr]: nextDayEvents });
    if(syncData) {
       syncData('calendar', dateStr, { dateStr, events: newCurrentDayEvents });
       syncData('calendar', nextDateStr, { dateStr: nextDateStr, events: nextDayEvents });
    }
    
    setSelectedEvent(null);
  };

  const generatePDF = async () => {
    setView('month'); // Force month view for the snapshot
    setTimeout(async () => {
      const element = document.getElementById('calendar-export-wrapper');
      if (!element) return;
      
      // Temporarily scroll to top and remove overflow restrictions on ALL parents
      const originalScroll = window.scrollY;
      window.scrollTo(0, 0);

      const originalStyles = [];
      let currentElement = element;
      while(currentElement && currentElement !== document.body && currentElement !== document.documentElement) {
        originalStyles.push({
          el: currentElement,
          height: currentElement.style.height,
          overflow: currentElement.style.overflow,
          position: currentElement.style.position,
          maxHeight: currentElement.style.maxHeight
        });
        currentElement.style.height = 'auto';
        currentElement.style.overflow = 'visible';
        currentElement.style.position = 'static';
        currentElement.style.maxHeight = 'none';
        currentElement = currentElement.parentElement;
      }
      
      const origWidth = element.style.width;
      const origPadding = element.style.padding;
      
      element.style.width = '1000px';
      element.style.padding = '16px';
      
      // Wait for reflow
      await new Promise(r => setTimeout(r, 100));
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        windowWidth: 1050,
        windowHeight: element.scrollHeight + 200,
        scrollY: 0,
        backgroundColor: document.body.classList.contains('theme-blackout') ? '#000000' : '#0d120c' 
      });
      
      // Restore styles
      for (const st of originalStyles) {
        st.el.style.height = st.height;
        st.el.style.overflow = st.overflow;
        st.el.style.position = st.position;
        st.el.style.maxHeight = st.maxHeight;
      }
      
      element.style.width = origWidth;
      element.style.padding = origPadding;
      window.scrollTo(0, originalScroll);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFont('helvetica', 'bold');
      doc.text(`Cuadrante - ${format(currentDate, "MMMM yyyy", {locale: es}).toUpperCase()}`, 14, 15);
      
      // Calculate image dimensions to fit the page
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(imgData, 'JPEG', 14, 20, pdfWidth, pdfHeight);
      doc.save(`Cuadrante_${format(currentDate, 'yyyy-MM')}.pdf`);
      setShowExportModal(false);
    }, 300); // 300ms delay to ensure React has fully rendered the month view and legend
  };

  useEffect(() => {
    // Request push permissions for alarms
    const initPush = async () => {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const p = await Notification.requestPermission();
        if(p === 'granted') subscribePush();
      } else if (Notification.permission === 'granted') {
        subscribePush();
      }
    };
    initPush();
  }, []);

  const subscribePush = async () => {
    try {
      const publicVapidKey = 'BGTE_eT0b2qpi2TKMpQW24iAoa01isfir9NuEnvpao1FEvMBGXWP1FEJ_d1FlL11ZBAQMFvTONs9eYi5SnGM3t0';
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
          const base64 = (publicVapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
          subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: outputArray });
          
          const token = localStorage.getItem('appmando_token');
          await fetch('/subscribe', {
            method: 'POST', body: JSON.stringify(subscription), headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` }
          });
        }
      }
    } catch(e) { console.error('Push err:', e); }
  };

  const next = () => {
    if(view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if(view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if(view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if(view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if(view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if(view === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const getDays = () => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), {weekStartsOn: 1});
      const end = endOfWeek(endOfMonth(currentDate), {weekStartsOn: 1});
      return eachDayOfInterval({start, end});
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, {weekStartsOn: 1});
      const end = endOfWeek(currentDate, {weekStartsOn: 1});
      return eachDayOfInterval({start, end});
    } else {
      return [currentDate];
    }
  };

  const days = getDays();
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const handleDayClick = (day) => {
    setCurrentDate(day);
    setView('day');
  };

  const addEvent = (e) => {
    e.preventDefault();
    if(!selectedDateStr) return;
    
    const dayEvents = events[selectedDateStr] || [];
    // If it's sport and sportId is set, find the sport title
    let finalTitle = newEvent.title;
    let finalPayload = { ...newEvent };

    if (newEvent.type === 'deporte' && newEvent.sportId) {
       const selectedSport = sports.find(s => s.id === newEvent.sportId);
       if (selectedSport) {
          const daysNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
          const dayName = daysNames[newEvent.sportDay] || 'Día';
          finalTitle = `${selectedSport.data?.name || 'Entrenamiento'} - Sem ${Number(newEvent.sportWeek) + 1} (${dayName})`;
       }
    }
    
    if (newEvent.type === 'servicio') {
       finalTitle = newEvent.title; 
    }
    
    if (newEvent.type === 'subordinado' && newEvent.subordinateId) {
       const sub = subordinates.find(s => s.id === newEvent.subordinateId);
       if (sub) {
          finalTitle = `[${sub.empleo} ${sub.name}] ${newEvent.title}`;
       }
    }

    let dateCursor = parseISO(selectedDateStr);
    const endDateCursor = newEvent.type === 'servicio' && newEvent.endDate ? parseISO(newEvent.endDate) : dateCursor;
    
    let newEventsState = { ...events };
    
    while (dateCursor <= endDateCursor) {
        const cDateStr = format(dateCursor, 'yyyy-MM-dd');
        const dEvents = newEventsState[cDateStr] || [];
        const createdEvent = { id: Date.now().toString() + Math.random(), ...finalPayload, title: finalTitle };
        const updatedDEvents = [...dEvents, createdEvent];
        newEventsState[cDateStr] = updatedDEvents;
        if(syncData) syncData('calendar', cDateStr, { dateStr: cDateStr, events: updatedDEvents });
        
        if ((createdEvent.type === 'tarea' || createdEvent.type === 'subordinado') && syncData) {
           const color = createdEvent.type === 'subordinado' ? 'subordinado' : (createdEvent.priority || '#ffffff');
           syncData('tasks', createdEvent.id, { title: createdEvent.title, alarmTime: createdEvent.alarmTime, completed: false, color });
        }
        
        dateCursor = addDays(dateCursor, 1);
    }
    
    setEvents(newEventsState);
    setNewEvent({ title: '', type: 'tarea', alarmTime: '', priority: '#ffffff', sportId: '', sportWeek: 0, sportDay: 0, subordinateId: '', endDate: '' });
    setShowEventForm(false);
  };

  const removeEvent = (dateStr, id) => {
    if(confirm('¿Eliminar evento?')) {
      const dayEvents = events[dateStr] || [];
      const newDayEvents = dayEvents.filter(ev => ev.id !== id);
      setEvents({ ...events, [dateStr]: newDayEvents });
      if(syncData) syncData('calendar', dateStr, { dateStr, events: newDayEvents });
      if(deleteData) deleteData('tasks', id);
      setSelectedEvent(null);
    }
  };

  const getEventColor = (type) => {
    if(type === 'deporte') return 'var(--color-primary)';
    if(type === 'subordinado') return 'var(--color-warning)';
    if(type === 'servicio') return 'var(--color-primary)'; // overwritten by priority
    return 'var(--color-text)'; // tarea
  };

  return (
    <div className="p-4" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <button onClick={prev} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-primary)'}}><ChevronLeft/></button>
          <h2 style={{fontSize: '1.1rem', margin: 0, textTransform: 'capitalize', width: '130px', textAlign: 'center', color: 'var(--color-primary)'}}>
            {format(currentDate, view === 'day' ? "d MMM yyyy" : "MMMM yyyy", {locale: es})}
          </h2>
          <button onClick={next} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-primary)'}}><ChevronRight/></button>
        </div>
        
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          <button onClick={handleOpenExport} style={{background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'}} title="Exportar PDF">
            <FileDown size={20} />
          </button>
          <div style={{display: 'flex', background: 'var(--color-surface)', borderRadius: '8px', padding: '4px', border: '1px solid var(--color-border)'}}>
            <button className={`btn-view ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Día</button>
            <button className={`btn-view ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Sem</button>
            <button className={`btn-view ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Mes</button>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div className="card" style={{width: '90%', maxWidth: '400px', textAlign: 'center'}}>
            <h2 className="card-title">Exportar Cuadrante</h2>
            <p style={{fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px'}}>Se generará un PDF con la vista visual del mes actual, incluyendo todas las guardias, maniobras y JIC/JIP marcadas.</p>
            <div style={{display: 'flex', gap: '8px'}}>
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)} style={{flex: 1}}>Cancelar</button>
              <button className="btn btn-primary" onClick={generatePDF} style={{flex: 1}}>Generar PDF</button>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div className="card" style={{width: '90%', maxWidth: '400px'}}>
            <h2 className="card-title">Detalles del Evento</h2>
            <p>{selectedEvent.title}</p>
            <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
              <button className="btn btn-primary" onClick={() => setSelectedEvent(null)} style={{flex: 1}}>Cerrar</button>
              <button className="btn btn-secondary" onClick={() => removeEvent(selectedDateStr, selectedEvent.id)} style={{color: 'var(--color-error)', borderColor: 'var(--color-error)'}}>Borrar</button>
            </div>
            <button className="btn btn-secondary" onClick={() => moveEventToNextDay(selectedDateStr, selectedEvent.id)} style={{width: '100%', marginTop: '8px', fontSize: '0.85rem'}}>Aplazar a mañana (+1 Día)</button>
          </div>
        </div>
      )}

      {/* Grid Header */}
      {view !== 'day' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center'}}>
          {weekDays.map(w => <div key={w} style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600'}}>{w}</div>)}
        </div>
      )}

      {/* Grid Content */}
      <div id="calendar-export-wrapper" style={{background: 'var(--color-bg)', padding: view === 'month' ? '8px' : '0'}}>
        <div id="calendar-grid" style={{
          display: view === 'day' ? 'block' : 'grid',
          gridTemplateColumns: view === 'day' ? '1fr' : 'repeat(7, 1fr)',
          gap: '8px',
          flex: view === 'day' ? 1 : 'none'
        }}>
          {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = events[dateStr] || [];
          const isSelectedMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          if (view === 'day') {
            return (
              <div key={dateStr} style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                  <h3 style={{color: 'var(--color-primary)'}}>Agenda Diaria</h3>
                  <button className="btn btn-primary" onClick={() => {
                    setSelectedDateStr(dateStr);
                    setShowEventForm(true);
                  }}>
                    <Plus size={16} /> Añadir Evento
                  </button>
                </div>
                
                {showEventForm && (
                  <form onSubmit={addEvent} className="card" style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'var(--color-surface-hover)'}}>
                    {newEvent.type !== 'deporte' ? (
                      <input required placeholder="Descripción..." value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <select required value={newEvent.sportId} onChange={e => setNewEvent({...newEvent, sportId: e.target.value})}>
                          <option value="">Selecciona Plan de Deporte...</option>
                          {sports.map(s => (
                            <option key={s.id} value={s.id}>{s.data?.name || 'Plan sin nombre'}</option>
                          ))}
                        </select>
                        {newEvent.sportId && (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <select value={newEvent.sportWeek} onChange={e => setNewEvent({...newEvent, sportWeek: Number(e.target.value)})} style={{flex: 1}}>
                              {Array.from({length: sports.find(s => s.id === newEvent.sportId)?.data?.weeks || 4}).map((_, i) => (
                                <option key={i} value={i}>Semana {i + 1}</option>
                              ))}
                            </select>
                            <select value={newEvent.sportDay} onChange={e => setNewEvent({...newEvent, sportDay: Number(e.target.value)})} style={{flex: 1}}>
                              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((d, i) => (
                                <option key={i} value={i}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{display: 'flex', gap: '8px'}}>
                      <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value, title: e.target.value === 'servicio' ? 'Maniobras' : newEvent.title, priority: e.target.value === 'servicio' ? '#795548' : '#ffffff'})} style={{flex: 1}}>
                        <option value="tarea">Tarea / Mando</option>
                        <option value="deporte">Deporte</option>
                        <option value="subordinado">Subordinado</option>
                        <option value="servicio">Servicio / Maniobras</option>
                      </select>
                      
                      {newEvent.type === 'tarea' && (
                        <select value={newEvent.priority} onChange={e => setNewEvent({...newEvent, priority: e.target.value})} style={{flex: 1}}>
                          <option value="#ffffff">Normal (Blanco)</option>
                          <option value="#bd9b44">Importante (Naranja)</option>
                          <option value="#a8423f">Crítica (Rojo)</option>
                        </select>
                      )}

                      {newEvent.type === 'servicio' && (
                        <select value={newEvent.title} onChange={e => {
                          let color = '#795548'; // Maniobras
                          if (e.target.value === 'JIC') color = '#4285f4'; // Azul
                          if (e.target.value === 'JIP') color = '#ff9800'; // Ámbar
                          setNewEvent({...newEvent, title: e.target.value, priority: color});
                        }} style={{flex: 1}}>
                          <option value="Maniobras">Maniobras (Marrón)</option>
                          <option value="JIC">JIC 48h (Azul)</option>
                          <option value="JIP">JIP 14h (Ámbar)</option>
                        </select>
                      )}
                    </div>
                    
                    {newEvent.type === 'servicio' && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--color-border)'}}>
                        <span style={{fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>Fecha Fin:</span>
                        <input type="date" value={newEvent.endDate} min={selectedDateStr} onChange={e => setNewEvent({...newEvent, endDate: e.target.value})} style={{border: 'none', padding: '10px 0', outline: 'none', background: 'transparent', flex: 1, color: 'var(--color-text)'}} />
                      </div>
                    )}
                    
                    {newEvent.type === 'subordinado' && (
                      <select required value={newEvent.subordinateId} onChange={e => setNewEvent({...newEvent, subordinateId: e.target.value})} style={{padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)'}}>
                        <option value="">Seleccionar Subordinado...</option>
                        {subordinates.map(s => (
                          <option key={s.id} value={s.id}>{s.empleo} {s.name}</option>
                        ))}
                      </select>
                    )}

                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--color-border)'}}>
                      <Bell size={16} color="var(--color-text-muted)" />
                      <input type="time" placeholder="Alarma (Opcional)" value={newEvent.alarmTime} onChange={e => setNewEvent({...newEvent, alarmTime: e.target.value})} style={{border: 'none', padding: '10px 0', outline: 'none', background: 'transparent'}} />
                    </div>

                    <div style={{display: 'flex', gap: '8px', marginTop: '4px'}}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowEventForm(false)} style={{flex: 1}}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" style={{flex: 1}}>Guardar Evento</button>
                    </div>
                  </form>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingBottom: '20px'}}>
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="card" style={{margin: 0, padding: '16px', borderLeft: `4px solid ${ev.type === 'tarea' || ev.type === 'servicio' ? (ev.priority || '#ffffff') : getEventColor(ev.type)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{flex: 1}}>
                        <span style={{fontSize: '0.75rem', textTransform: 'uppercase', color: ev.type === 'tarea' || ev.type === 'servicio' ? (ev.priority || '#ffffff') : getEventColor(ev.type), fontWeight: 'bold'}}>{ev.type}</span>
                        <p style={{marginTop: '4px', fontSize: '1rem', wordBreak: 'break-word'}}>{ev.title}</p>
                        {ev.alarmTime && (
                          <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px'}}>
                            <Bell size={12} /> Alarma activa: {ev.alarmTime}
                          </span>
                        )}
                      </div>
                      <button onClick={() => removeEvent(dateStr, ev.id)} style={{background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '8px', fontSize: '1.2rem'}}>&times;</button>
                    </div>
                  ))}
                  {dayEvents.length === 0 && !showEventForm && <p style={{color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px', fontStyle: 'italic'}}>No hay eventos programados para hoy.</p>}
                </div>
              </div>
            );
          }

          return (
            <div 
              key={dateStr} 
              onClick={() => handleDayClick(day)}
              style={{
                aspectRatio: '1',
                padding: '4px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: isTodayDate ? 'rgba(74, 117, 60, 0.1)' : 'var(--color-surface)',
                opacity: isSelectedMonth ? 1 : 0.3,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <span style={{fontSize: '0.9rem', fontWeight: isTodayDate ? 'bold' : 'normal', color: isTodayDate ? 'var(--color-primary)' : 'inherit'}}>
                {format(day, 'd')}
              </span>
              <div style={{display: 'flex', gap: '3px', marginTop: 'auto', marginBottom: '4px'}}>
                {dayEvents.slice(0,3).map((ev, i) => (
                  <div key={i} style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ev.type === 'tarea' || ev.type === 'servicio' ? (ev.priority || '#ffffff') : getEventColor(ev.type)}}></div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
        
        {view === 'month' && (
          <div style={{marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '16px'}}>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#a8423f', borderRadius:'3px'}}></div> URGENTE</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#bd9b44', borderRadius:'3px'}}></div> IMPORTANTE</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#ffffff', border:'1px solid #ccc', borderRadius:'3px'}}></div> NORMAL</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#795548', borderRadius:'3px'}}></div> MANIOBRAS</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#4285f4', borderRadius:'3px'}}></div> JIC 48h</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'#ff9800', borderRadius:'3px'}}></div> JIP 14h</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'var(--color-primary)', borderRadius:'3px'}}></div> DEPORTE</span>
            <span style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'12px', height:'12px', background:'var(--color-warning)', borderRadius:'3px'}}></div> SUBORDINADOS</span>
          </div>
        )}
      </div>

      <style>{`
        .btn-view {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-view.active {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
