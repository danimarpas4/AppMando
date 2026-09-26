import React, { useState } from 'react';
import { Shield, Plus, Trash2, CalendarOff, CheckCircle, Edit3 } from 'lucide-react';
import { isWithinInterval, startOfDay, parseISO } from 'date-fns';

export default function Superiors({ initialData = [], syncData, deleteData }) {
  const [superiors, setSuperiors] = useState(() => {
    return initialData.superiors || [];
  });

  const [supForm, setSupForm] = useState({ name: '', empleo: '', cargo: '', notes: '', armamento: '', armamentoSerie: '', anpvs: '', transmisiones: '', absences: [] });
  const [showAbsenceForm, setShowAbsenceForm] = useState(null);
  const [absenceData, setAbsenceData] = useState({ startDate: '', endDate: '', reason: 'Permiso' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    let updatedList;
    if (editingId) {
      updatedList = superiors.map(sup => sup.id === editingId ? { ...supForm, id: editingId } : sup);
      if (syncData) syncData('superiors', editingId, supForm);
    } else {
      const newId = Date.now().toString();
      const newSup = { ...supForm, id: newId };
      updatedList = [...superiors, newSup];
      if (syncData) syncData('superiors', newId, newSup);
    }
    setSuperiors(updatedList);
    resetForm();
  };

  const resetForm = () => {
    setSupForm({ name: '', empleo: '', cargo: '', notes: '', armamento: '', armamentoSerie: '', anpvs: '', transmisiones: '', absences: [] });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (sup) => {
    setSupForm(sup);
    setEditingId(sup.id);
    setShowForm(true);
  };
  
  const removeSuperior = (id) => {
    if(confirm('¿Seguro que deseas eliminar este superior?')) {
      setSuperiors(superiors.filter(s => s.id !== id));
      if (deleteData) deleteData('superiors', id);
    }
  };

  const handleAddAbsence = (e, supId) => {
    e.preventDefault();
    const sup = superiors.find(s => s.id === supId);
    if (!sup) return;
    
    const newAbsence = { ...absenceData, id: Date.now().toString() };
    const updatedSup = { ...sup, absences: [...(sup.absences || []), newAbsence] };
    
    setSuperiors(superiors.map(s => s.id === supId ? updatedSup : s));
    if (syncData) syncData('superiors', supId, updatedSup);
    
    setShowAbsenceForm(null);
    setAbsenceData({ startDate: '', endDate: '', reason: 'Permiso' });
  };

  const removeAbsence = (supId, absenceId) => {
    const sup = superiors.find(s => s.id === supId);
    if (!sup) return;
    const updatedSup = { ...sup, absences: sup.absences.filter(a => a.id !== absenceId) };
    setSuperiors(superiors.map(s => s.id === supId ? updatedSup : s));
    if (syncData) syncData('superiors', supId, updatedSup);
  };

  const isAbsentToday = (absences = []) => {
    // Evitamos problemas de zona horaria comparando directamente los strings YYYY-MM-DD
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return absences.some(a => {
      if (!a || !a.startDate || !a.endDate) return false;
      return todayStr >= a.startDate && todayStr <= a.endDate;
    });
  };

  return (
    <div className="p-4" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
      
      {/* Cadena de Mando */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{margin: 0}}>Cadena de Mando</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nuevo
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card" style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
            <h3 style={{color: 'var(--color-primary)', marginBottom: '8px'}}>{editingId ? 'Editar Superior' : 'Nuevo Registro'}</h3>
            <input required placeholder="Empleo (Ej: Capitán)" value={supForm.empleo} onChange={e => setSupForm({...supForm, empleo: e.target.value})} />
            <input required placeholder="Apellidos y Nombre" value={supForm.name} onChange={e => setSupForm({...supForm, name: e.target.value})} />
            <input placeholder="Cargo (Ej: Jefe de Compañía)" value={supForm.cargo} onChange={e => setSupForm({...supForm, cargo: e.target.value})} />
            
            <label style={{color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold'}}>Material Asignado</label>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
              <select value={supForm.armamento || ''} onChange={e => setSupForm({...supForm, armamento: e.target.value})} style={{flex: 1, minWidth: '120px'}}>
                <option value="">Sin Armamento</option>
                <option value="Fusil">Fusil HK G36</option>
                <option value="Fusil + AG">Fusil + AG</option>
                <option value="MG4">Ametralladora MG4</option>
                <option value="HK USP Compact">Pistola HK USP</option>
              </select>
              <input placeholder="Nº Serie Arma" value={supForm.armamentoSerie || ''} onChange={e => setSupForm({...supForm, armamentoSerie: e.target.value})} style={{flex: 1, minWidth: '120px'}} />
              <input placeholder="ANPVS (Visor)" value={supForm.anpvs || ''} onChange={e => setSupForm({...supForm, anpvs: e.target.value})} style={{flex: 1, minWidth: '120px'}} />
            </div>
            <input placeholder="Transmisiones (Nº Serie PR4G...)" value={supForm.transmisiones || ''} onChange={e => setSupForm({...supForm, transmisiones: e.target.value})} />
            
            <label style={{color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold'}}>Diario de Mando / Anotaciones</label>
            <textarea 
              placeholder="Directrices, perfil, notas sobre este mando..." 
              value={supForm.notes || ''} 
              onChange={e => setSupForm({...supForm, notes: e.target.value})}
              style={{minHeight: '100px'}}
            />

            <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
              <button type="button" className="btn btn-secondary" onClick={resetForm} style={{flex: 1}}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{flex: 1}}>Guardar</button>
            </div>
          </form>
        )}

        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {superiors.map(sup => {
            const absent = isAbsentToday(sup.absences);
            return (
              <div key={sup.id} className="card" style={{margin: 0, padding: '16px', display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                  <Shield size={24} color="var(--color-primary)" style={{marginTop: '4px'}} />
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                      <h3 style={{fontSize: '1.1rem', color: 'var(--color-primary)', margin: 0}}>{sup.empleo} {sup.name}</h3>
                      <span style={{
                        background: absent ? 'rgba(168, 66, 63, 0.15)' : 'rgba(74, 117, 60, 0.15)',
                        color: absent ? 'var(--color-error)' : 'var(--color-success)',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        {absent ? <CalendarOff size={12}/> : <CheckCircle size={12}/>}
                        {absent ? 'AUSENTE' : 'PRESENTE'}
                      </span>
                    </div>
                    <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px'}}>{sup.cargo}</p>
                    
                    {(sup.armamento || sup.anpvs || sup.transmisiones) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                        {sup.armamento && <span>🔫 {sup.armamento} {sup.armamentoSerie && `(${sup.armamentoSerie})`}</span>}
                        {sup.anpvs && <span>👓 ANPVS: {sup.anpvs}</span>}
                        {sup.transmisiones && <span>📻 Transmisiones: {sup.transmisiones}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <button onClick={() => handleEdit(sup)} style={{background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px'}}>
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => removeSuperior(sup.id)} style={{background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px'}}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Sección Ausencias */}
                <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                    <h4 style={{fontSize: '0.9rem', color: 'var(--color-primary)'}}>Control de Asistencia</h4>
                    <button onClick={() => setShowAbsenceForm(showAbsenceForm === sup.id ? null : sup.id)} style={{background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer'}}>
                      + Registrar Ausencia
                    </button>
                  </div>

                  {showAbsenceForm === sup.id && (
                    <form onSubmit={(e) => handleAddAbsence(e, sup.id)} style={{display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-bg)', padding: '12px', borderRadius: '8px', marginBottom: '12px'}}>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <div style={{flex: 1}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>Desde</label>
                          <input type="date" required value={absenceData.startDate} onChange={e => setAbsenceData({...absenceData, startDate: e.target.value})} style={{padding: '6px', fontSize: '0.9rem'}}/>
                        </div>
                        <div style={{flex: 1}}>
                          <label style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>Hasta</label>
                          <input type="date" required value={absenceData.endDate} onChange={e => setAbsenceData({...absenceData, endDate: e.target.value})} style={{padding: '6px', fontSize: '0.9rem'}}/>
                        </div>
                      </div>
                      <select value={absenceData.reason} onChange={e => setAbsenceData({...absenceData, reason: e.target.value})} style={{padding: '6px', fontSize: '0.9rem'}}>
                        <option value="Permiso">Permiso</option>
                        <option value="Baja Médica">Baja Médica</option>
                        <option value="Comisión">Comisión</option>
                        <option value="Servicio">Saliente Servicio</option>
                      </select>
                      <button type="submit" className="btn btn-primary" style={{padding: '6px', fontSize: '0.85rem'}}>Guardar</button>
                    </form>
                  )}

                  {sup.absences && sup.absences.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      {sup.absences.map(a => (
                        <div key={a.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--color-bg)', padding: '6px 8px', borderRadius: '4px'}}>
                          <span>{a.reason}: {a.startDate} a {a.endDate}</span>
                          <button onClick={() => removeAbsence(sup.id, a.id)} style={{background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer'}}>&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {superiors.length === 0 && <p style={{color: 'var(--color-text-muted)', textAlign: 'center'}}>No hay mandos registrados.</p>}
        </div>
      </div>
    </div>
  );
}
