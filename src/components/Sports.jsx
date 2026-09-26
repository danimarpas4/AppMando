import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, CalendarPlus } from 'lucide-react';
import { addDays, parseISO, format, getDay, isWeekend } from 'date-fns';

export default function Sports({ initialData = [], activeContext, syncData, deleteData, appData }) {
  const [plans, setPlans] = useState(() => {
    if (initialData && initialData.length > 0) {
      return initialData;
    }
    // Migración por si hay datos antiguos en localStorage
    const saved = localStorage.getItem('appmando_sports_plans');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Sincronizarlos al backend si syncData existe
      if (syncData) {
        parsed.forEach(p => syncData('sports', p.id.toString(), p));
      }
      return parsed;
    }
    return [];
  });

  const [activePlanId, setActivePlanId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanWeeks, setNewPlanWeeks] = useState(4);
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStartDate, setAssignStartDate] = useState('');

  useEffect(() => {
    if (activeContext && activeContext.planId) {
      setActivePlanId(activeContext.planId);
    }
  }, [activeContext]);

  const createPlan = (e) => {
    e.preventDefault();
    const newId = Date.now().toString();
    const newPlan = {
      id: newId,
      name: newPlanName,
      weeks: newPlanWeeks,
      workouts: {} 
    };
    setPlans([...plans, newPlan]);
    setNewPlanName('');
    setShowForm(false);
    setActivePlanId(newPlan.id);
    if (syncData) syncData('sports', newId, newPlan);
  };

  const updateWorkout = (planId, week, day, text) => {
    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        const updated = { ...p, workouts: { ...p.workouts, [`${week}_${day}`]: text } };
        if (syncData) syncData('sports', planId.toString(), updated);
        return updated;
      }
      return p;
    });
    setPlans(updatedPlans);
  };

  const removePlan = (id) => {
    if(confirm('¿Eliminar plan?')) {
      setPlans(plans.filter(p => p.id !== id));
      if(activePlanId === id) setActivePlanId(null);
      if(deleteData) deleteData('sports', id.toString());
    }
  };

  const handleAssignBulk = (e) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan || !assignStartDate) return;

    let currentDate = parseISO(assignStartDate);
    const calendarArray = appData?.calendar || [];
    
    let daysAssigned = 0;
    const totalDays = plan.weeks * 5; // 5 days per week
    
    let currentWeek = 0;
    let currentDayOfWeek = 0; // 0 to 4 (L to V)

    while (daysAssigned < totalDays) {
      if (!isWeekend(currentDate)) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Find existing events for this day
        const existingRow = calendarArray.find(c => c.dateStr === dateStr);
        const existingEvents = existingRow ? existingRow.events : [];
        
        // Remove old 'deporte' event to apply Option A (Overwrite)
        const filteredEvents = existingEvents.filter(ev => ev.type !== 'deporte');
        
        const daysNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const dayName = daysNames[currentDayOfWeek];
        
        const newEvent = {
          id: Date.now().toString() + daysAssigned,
          title: `${plan.name} - Sem ${currentWeek + 1} (${dayName})`,
          type: 'deporte',
          alarmTime: '',
          priority: 'var(--color-primary)',
          sportId: plan.id,
          sportWeek: currentWeek,
          sportDay: currentDayOfWeek
        };
        
        const newDayEvents = [...filteredEvents, newEvent];
        if (syncData) syncData('calendar', dateStr, { dateStr, events: newDayEvents });
        
        daysAssigned++;
        currentDayOfWeek++;
        if (currentDayOfWeek > 4) {
          currentDayOfWeek = 0;
          currentWeek++;
        }
      }
      currentDate = addDays(currentDate, 1);
    }
    
    setShowAssignModal(false);
    setAssignStartDate('');
    alert(`Plan "${plan.name}" asignado correctamente a la Agenda.`);
  };

  const renderActivePlan = () => {
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan) return null;

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    return (
      <div className="card" style={{marginTop: '16px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 style={{color: 'var(--color-primary)'}}>{plan.name} ({plan.weeks} Semanas)</h3>
          <div style={{display: 'flex', gap: '8px'}}>
            <button className="btn btn-primary" onClick={() => setShowAssignModal(true)} style={{padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}><CalendarPlus size={14}/> Asignar</button>
            <button className="btn btn-secondary" onClick={() => removePlan(plan.id)} style={{color: 'var(--color-error)', borderColor: 'var(--color-error)', padding: '4px 8px', fontSize: '0.8rem'}}>Borrar</button>
          </div>
        </div>
        
        {Array.from({length: plan.weeks}).map((_, weekIndex) => (
          <div key={weekIndex} style={{marginBottom: '24px'}}>
            <h4 style={{marginBottom: '8px', color: 'var(--color-secondary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px'}}>Semana {weekIndex + 1}</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {days.map((day, dayIndex) => {
                const key = `${weekIndex}_${dayIndex}`;
                return (
                  <div key={dayIndex} style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>{day}</span>
                    <textarea 
                      rows="2"
                      placeholder={`Entrenamiento para ${day}...`}
                      value={plan.workouts[key] || ''}
                      onChange={(e) => updateWorkout(plan.id, weekIndex, dayIndex, e.target.value)}
                      style={{fontSize: '0.9rem'}}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="card-title" style={{margin: 0}}>Planes de Deporte</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Nuevo
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPlan} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input required placeholder="Nombre del plan (Ej: Mesociclo Fuerza)" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} />
          <div>
            <label style={{fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>Semanas de duración (Máx 8):</label>
            <input type="number" required min="1" max="8" value={newPlanWeeks} onChange={e => setNewPlanWeeks(Number(e.target.value))} />
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} style={{flex: 1}}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{flex: 1}}>Crear Plan</button>
          </div>
        </form>
      )}

      {/* Selector de Planes */}
      {plans.length > 0 && (
        <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none'}}>
          {plans.map(p => (
            <button 
              key={p.id}
              className={`btn ${activePlanId === p.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActivePlanId(p.id)}
              style={{whiteSpace: 'nowrap'}}
            >
              <Dumbbell size={16} /> {p.name}
            </button>
          ))}
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <p style={{textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px'}}>No hay planes creados.</p>
      )}

      {showAssignModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <form onSubmit={handleAssignBulk} className="card" style={{width: '90%', maxWidth: '400px'}}>
            <h3 className="card-title">Asignar a Agenda</h3>
            <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px'}}>Elige la fecha de inicio. Se sobrescribirán otras sesiones de deporte previas en esos días (Lunes a Viernes).</p>
            <input type="date" required value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} style={{marginBottom: '16px'}} />
            <div style={{display: 'flex', gap: '8px'}}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)} style={{flex: 1}}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{flex: 1}}>Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {renderActivePlan()}
    </div>
  );
}
