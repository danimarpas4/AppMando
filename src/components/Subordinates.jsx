import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, Edit3, CalendarOff, CheckCircle } from 'lucide-react';
import { isWithinInterval, startOfDay, parseISO } from 'date-fns';

export default function Subordinates({ initialData = [], syncData, deleteData }) {
  const [subordinates, setSubordinates] = useState(() => {
    return initialData || [];
  });
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAbsenceForm, setShowAbsenceForm] = useState(null);

  const [formData, setFormData] = useState({
    name: '', empleo: '', procedencia: '', estudios: '', 
    idiomas: '', paef: '', ap: '', pa: '', po: '',
    notes: '',
    lesion: '',
    armamento: '',
    armamentoSerie: '',
    anpvs: '',
    absences: []
  });

  const [absenceData, setAbsenceData] = useState({
    startDate: '',
    endDate: '',
    reason: 'Permiso'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    let updatedList;
    if (editingId) {
      updatedList = subordinates.map(sub => sub.id === editingId ? { ...formData, id: editingId } : sub);
      if (syncData) syncData('subordinates', editingId, formData);
    } else {
      const newId = Date.now().toString();
      const newSub = { ...formData, id: newId };
      updatedList = [...subordinates, newSub];
      if (syncData) syncData('subordinates', newId, formData);
    }
    setSubordinates(updatedList);
    resetForm();
  };

  const resetForm = () => {
    setFormData({name: '', empleo: '', procedencia: '', estudios: '', idiomas: '', paef: '', ap: '', pa: '', po: '', notes: '', lesion: '', armamento: '', armamentoSerie: '', anpvs: '', absences: []});
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (sub) => {
    setFormData(sub);
    setEditingId(sub.id);
    setShowForm(true);
  };

  const removeSubordinate = (id) => {
    if(confirm('¿Seguro que deseas eliminar este registro?')) {
      setSubordinates(subordinates.filter(sub => sub.id !== id));
      if (deleteData) deleteData('subordinates', id);
    }
  };

  const handleAddAbsence = (e, subId) => {
    e.preventDefault();
    const sub = subordinates.find(s => s.id === subId);
    if (!sub) return;
    
    const newAbsence = { ...absenceData, id: Date.now().toString() };
    const updatedSub = { ...sub, absences: [...(sub.absences || []), newAbsence] };
    
    setSubordinates(subordinates.map(s => s.id === subId ? updatedSub : s));
    if (syncData) syncData('subordinates', subId, updatedSub);
    
    setShowAbsenceForm(null);
    setAbsenceData({ startDate: '', endDate: '', reason: 'Permiso' });
  };

  const removeAbsence = (subId, absenceId) => {
    const sub = subordinates.find(s => s.id === subId);
    if (!sub) return;
    const updatedSub = { ...sub, absences: sub.absences.filter(a => a.id !== absenceId) };
    setSubordinates(subordinates.map(s => s.id === subId ? updatedSub : s));
    if (syncData) syncData('subordinates', subId, updatedSub);
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
    <div className="p-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="card-title" style={{margin: 0}}>Personal a Cargo</h2>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> Nuevo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{color: 'var(--color-primary)', marginBottom: '8px'}}>{editingId ? 'Editar Personal' : 'Nuevo Registro'}</h3>
          <input required placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required placeholder="Empleo (Ej: Cabo Primero)" value={formData.empleo} onChange={e => setFormData({...formData, empleo: e.target.value})} />
          <input placeholder="Procedencia" value={formData.procedencia} onChange={e => setFormData({...formData, procedencia: e.target.value})} />
          <div style={{display: 'flex', gap: '8px'}}>
            <input placeholder="Estudios" value={formData.estudios} onChange={e => setFormData({...formData, estudios: e.target.value})} style={{flex: 1}} />
            <input placeholder="Idiomas" value={formData.idiomas} onChange={e => setFormData({...formData, idiomas: e.target.value})} style={{flex: 1}} />
          </div>
          <input type="number" step="0.1" placeholder="Nota PAEF" value={formData.paef} onChange={e => setFormData({...formData, paef: e.target.value})} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input type="number" placeholder="Días AP" value={formData.ap} onChange={e => setFormData({...formData, ap: e.target.value})} />
            <input type="number" placeholder="Días DA" value={formData.pa} onChange={e => setFormData({...formData, pa: e.target.value})} />
            <input type="number" placeholder="Días PO" value={formData.po} onChange={e => setFormData({...formData, po: e.target.value})} />
          </div>

          <label style={{color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold'}}>Material Asignado</label>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            <select value={formData.armamento || ''} onChange={e => setFormData({...formData, armamento: e.target.value})} style={{flex: 1, minWidth: '120px'}}>
              <option value="">Sin Armamento</option>
              <option value="Fusil">Fusil HK G36</option>
              <option value="Fusil + AG">Fusil + AG</option>
              <option value="MG4">Ametralladora MG4</option>
              <option value="HK USP Compact">Pistola HK USP</option>
            </select>
            <input placeholder="Nº Serie Arma" value={formData.armamentoSerie || ''} onChange={e => setFormData({...formData, armamentoSerie: e.target.value})} style={{flex: 1, minWidth: '120px'}} />
            <input placeholder="ANPVS (Visor)" value={formData.anpvs || ''} onChange={e => setFormData({...formData, anpvs: e.target.value})} style={{flex: 1, minWidth: '120px'}} />
          </div>

          <label style={{color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold'}}>Estado Físico / Novedad</label>
          <input placeholder="Lesión, rebaje o molestia actual..." value={formData.lesion || ''} onChange={e => setFormData({...formData, lesion: e.target.value})} />

          <label style={{color: 'var(--color-primary)', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold'}}>Diario de Evaluación (Para IPEC)</label>
          <textarea 
            placeholder="Añade valoraciones, hitos o faltas..." 
            value={formData.notes || ''} 
            onChange={e => setFormData({...formData, notes: e.target.value})}
            style={{minHeight: '100px'}}
          />

          <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
            <button type="button" className="btn btn-secondary" onClick={resetForm} style={{flex: 1}}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{flex: 1}}>Guardar</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subordinates.map(sub => {
          const absent = isAbsentToday(sub.absences);
          return (
            <div key={sub.id} className="card" style={{ marginBottom: 0, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <User size={18} /> {sub.empleo} {sub.name}
                    </h3>
                    <span style={{
                      background: absent ? 'rgba(168, 66, 63, 0.15)' : 'rgba(74, 117, 60, 0.15)',
                      color: absent ? 'var(--color-error)' : 'var(--color-success)',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      {absent ? <CalendarOff size={12}/> : <CheckCircle size={12}/>}
                      {absent ? 'AUSENTE' : 'PRESENTE'}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '6px 0' }}>
                    Procedencia: {sub.procedencia || '-'} | PAEF: {sub.paef || '-'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', marginTop: '8px' }}>
                    <span style={{background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px'}}>AP: {sub.ap || 0}</span>
                    <span style={{background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px'}}>DA: {sub.pa || 0}</span>
                    <span style={{background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px'}}>PO: {sub.po || 0}</span>
                  </div>

                  {(sub.armamento || sub.anpvs) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', marginTop: '8px', color: 'var(--color-text-muted)' }}>
                      {sub.armamento && <span>🔫 {sub.armamento} {sub.armamentoSerie && `(${sub.armamentoSerie})`}</span>}
                      {sub.anpvs && <span>👓 ANPVS: {sub.anpvs}</span>}
                    </div>
                  )}
                  
                  {sub.lesion && (
                    <div style={{marginTop: '8px', background: 'rgba(189, 155, 68, 0.1)', borderLeft: '3px solid var(--color-warning)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem'}}>
                      <strong style={{color: 'var(--color-warning)'}}>Novedad médica:</strong> {sub.lesion}
                    </div>
                  )}
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <button onClick={() => handleEdit(sub)} style={{background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px'}}>
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => removeSubordinate(sub.id)} style={{background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px'}}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Sección Ausencias */}
              <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <h4 style={{fontSize: '0.9rem', color: 'var(--color-primary)'}}>Control de Asistencia</h4>
                  <button onClick={() => setShowAbsenceForm(showAbsenceForm === sub.id ? null : sub.id)} style={{background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer'}}>
                    + Registrar Ausencia
                  </button>
                </div>

                {showAbsenceForm === sub.id && (
                  <form onSubmit={(e) => handleAddAbsence(e, sub.id)} style={{display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-bg)', padding: '12px', borderRadius: '8px', marginBottom: '12px'}}>
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

                {sub.absences && sub.absences.length > 0 && (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    {sub.absences.map(a => (
                      <div key={a.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--color-bg)', padding: '6px 8px', borderRadius: '4px'}}>
                        <span>{a.reason}: {a.startDate} a {a.endDate}</span>
                        <button onClick={() => removeAbsence(sub.id, a.id)} style={{background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer'}}>&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {subordinates.length === 0 && !showForm && (
          <p style={{textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px'}}>No hay personal registrado.</p>
        )}
      </div>
    </div>
  );
}
